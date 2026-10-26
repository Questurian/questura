import contextlib
import importlib.util
import io
from pathlib import Path
import stat
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("restore_deploy", Path(__file__).with_name("restore-railway-deploy-token.py"))
restore = importlib.util.module_from_spec(spec)
spec.loader.exec_module(restore)
TOKEN = "synthetic-token-never-a-real-credential"


def response(scope=None, errors=None):
    import json
    return SimpleNamespace(returncode=0, stdout=json.dumps({"data": {"projectToken": scope}, "errors": errors}))


class RestoreDeployTokenTests(unittest.TestCase):
    def test_normalizes_one_value_without_executing_assignments(self):
        self.assertEqual(restore.normalize_token(TOKEN), TOKEN)
        self.assertEqual(restore.normalize_token(f'export RAILWAY_TOKEN="{TOKEN}"'), TOKEN)
        for invalid in ["****-8470", "github-deploy", "one-token another-token", "$(print-private-data)", TOKEN + "\n" + TOKEN]:
            with self.subTest(invalid=invalid), self.assertRaises(restore.SetupError):
                restore.normalize_token(invalid)

    def test_atomic_vault_save_preserves_other_secrets_and_restricts_permissions(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "vault" / "deploy.env"
            path.parent.mkdir()
            original = "# Keep this comment\nCLOUDFLARE_DEPLOY_TOKEN=synthetic-other-key\nRAILWAY_DEPLOY_TOKEN=old\nexport RAILWAY_DEPLOY_TOKEN=duplicate\n"
            path.write_text(original)
            restore.save_token(TOKEN, path)
            self.assertEqual(path.read_text(), "# Keep this comment\nCLOUDFLARE_DEPLOY_TOKEN=synthetic-other-key\n" + f"RAILWAY_DEPLOY_TOKEN={TOKEN}\n")
            self.assertEqual(restore.read_saved(path), TOKEN)
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
            self.assertEqual(stat.S_IMODE(path.parent.stat().st_mode), 0o700)
            self.assertEqual(sorted(p.name for p in path.parent.iterdir()), ["deploy.env"])

    def test_refuses_symlink_vault_without_touching_target(self):
        with tempfile.TemporaryDirectory() as root:
            target = Path(root) / "other.env"
            target.write_text("do-not-change")
            path = Path(root) / "deploy.env"
            path.symlink_to(target)
            with self.assertRaises(restore.SetupError):
                restore.save_token(TOKEN, path)
            self.assertEqual(target.read_text(), "do-not-change")

    def test_railway_credential_is_only_in_stdin_and_scope_is_exact(self):
        scope = {"projectId": restore.PROJECT_ID, "environmentId": restore.ENVIRONMENT_ID}
        with patch.object(restore, "run", return_value=response(scope)) as call:
            restore.validate_token(TOKEN)
        args, kwargs = call.call_args
        self.assertNotIn(TOKEN, " ".join(args[0]))
        self.assertIn(f"Project-Access-Token: {TOKEN}", kwargs["input"])
        self.assertNotIn("--insecure", args[0])
        self.assertIn("--fail", args[0])
        for key in ["projectId", "environmentId"]:
            wrong = {**scope, key: "wrong-scope"}
            with patch.object(restore, "run", return_value=response(wrong)), self.assertRaises(restore.SetupError):
                restore.validate_token(TOKEN)

    def test_server_error_cannot_echo_a_token_in_our_error(self):
        with patch.object(restore, "run", return_value=response(errors=[{"message": TOKEN}])):
            with self.assertRaises(restore.SetupError) as error:
                restore.validate_token(TOKEN)
        self.assertNotIn(TOKEN, str(error.exception))

    def test_github_updates_only_the_existing_production_secret_via_stdin(self):
        with patch.object(restore, "github_ready"), patch.object(restore, "run", return_value=SimpleNamespace(returncode=0)) as call:
            restore.sync_github(TOKEN)
        self.assertEqual(call.call_args.args[0], ["gh", "secret", "set", "RAILWAY_TOKEN", "--env", "production", "--repo", "Questurian/questura"])
        self.assertEqual(call.call_args.kwargs["input"], TOKEN)

    def test_rejected_token_never_reaches_vault_or_github(self):
        with patch.object(restore.shutil, "which", return_value="installed"), patch.object(restore.sys.stdin, "isatty", return_value=True), patch.object(restore.getpass, "getpass", return_value=TOKEN), patch.object(restore, "validate_token", side_effect=restore.SetupError("rejected")), patch.object(restore, "save_token") as save, patch.object(restore, "sync_github") as sync, contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(restore.SetupError):
                restore.main([])
        save.assert_not_called()
        sync.assert_not_called()

    def test_sync_failure_keeps_a_valid_token_available_for_retry(self):
        original_save = restore.save_token
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "vault" / "deploy.env"
            with patch.object(restore.shutil, "which", return_value="installed"), patch.object(restore.sys.stdin, "isatty", return_value=True), patch.object(restore.getpass, "getpass", return_value=TOKEN), patch.object(restore, "validate_token"), patch.object(restore, "save_token", side_effect=lambda token: original_save(token, path)), patch.object(restore, "sync_github", side_effect=restore.SetupError("sync failed")), contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaises(restore.SetupError):
                    restore.main([])
            self.assertEqual(restore.read_saved(path), TOKEN)
            with patch.object(restore.shutil, "which", return_value="installed"), patch.object(restore, "read_saved", return_value=TOKEN), patch.object(restore, "validate_token") as validate, patch.object(restore, "sync_github") as sync, patch.object(restore.getpass, "getpass") as prompt, contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(restore.main(["--sync-saved"]), 0)
            validate.assert_called_once_with(TOKEN)
            sync.assert_called_once_with(TOKEN)
            prompt.assert_not_called()

    def test_command_line_mistakes_never_echo_pasted_credentials(self):
        for argv in [[TOKEN], ["--check=" + TOKEN]]:
            with self.subTest(argv=argv), self.assertRaises(restore.SetupError) as error:
                restore.main(argv)
            self.assertNotIn(TOKEN, str(error.exception))


if __name__ == "__main__":
    unittest.main()
