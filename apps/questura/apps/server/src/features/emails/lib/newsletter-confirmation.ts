import type { Payload } from 'payload'

import {
  createActionLink,
  createFooter,
  createInfoBox,
  EMAIL_PARAGRAPH_STYLE,
  sendEmail,
  wrapEmailContent,
} from './email-utils'
import type { EmailResult, NewsletterConfirmationEmailData } from '../types'

/**
 * The double opt-in mail. Anyone can type any address into a signup form, so
 * this is the only proof the inbox's owner asked for the newsletter, and
 * until its link is clicked the address gets nothing else from us.
 */
export async function sendNewsletterConfirmationEmail(
  payload: Payload,
  { email, url }: NewsletterConfirmationEmailData
): Promise<EmailResult> {
  const html = wrapEmailContent(`
    <h1 style="color: #333; text-align: center;">Confirm your subscription</h1>
    <p style="${EMAIL_PARAGRAPH_STYLE}">
      Thanks for signing up for the Questurian newsletter: once a month, our newest
      guides and a short note from the team.
    </p>
    <p style="${EMAIL_PARAGRAPH_STYLE}">
      Click below to confirm this is your address. The link works for 7 days.
    </p>
    ${createActionLink(url, 'Confirm subscription')}
    ${createInfoBox('info', '<strong>Did not sign up?</strong> Ignore this email and you will not be added.')}
    ${createFooter('Questurian Team')}
  `)

  return sendEmail(payload, {
    emailType: 'newsletter confirmation',
    to: email,
    subject: 'Confirm your Questurian newsletter subscription',
    html,
  })
}
