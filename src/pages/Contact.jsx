import { useState } from 'react';
import { getPageBySlug, sendContactForm } from '../api/wp';
import { CF7_FORM_ID, CONTACT_EMAIL, PAGE_SLUGS } from '../config';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';
import { decodeHtml } from '../utils/format';
import { Field } from '../components/AddressFields';
import HtmlContent from '../components/HtmlContent';
import PageHeader from '../components/PageHeader';
import { ErrorMessage, Spinner } from '../components/Feedback';

/**
 * Contact page: content comes from your WordPress "contact" page.
 * A working form is shown only if Contact Form 7 is configured (VITE_CF7_FORM_ID);
 * otherwise an email button is shown if VITE_CONTACT_EMAIL is set.
 */
export default function Contact() {
  // A missing WordPress page is fine here: the form can still be shown.
  const { data: page, loading } = useAsync(() => getPageBySlug(PAGE_SLUGS.contact).catch(() => false), []);
  usePageTitle('Contact');

  return (
    <>
      <PageHeader title={page ? decodeHtml(page.title.rendered) : 'Contact us'} />
      <div className="container narrow section">
        {loading && !page && page !== false ? (
          <Spinner />
        ) : (
          <>
            {page && <HtmlContent html={page.content.rendered} />}
            {CF7_FORM_ID && <ContactForm formId={CF7_FORM_ID} />}
            {CONTACT_EMAIL && (
              <p className="contact-email">
                <a className="btn btn-outline" href={`mailto:${CONTACT_EMAIL}`}>
                  Email {CONTACT_EMAIL}
                </a>
              </p>
            )}
            {!page && !CF7_FORM_ID && !CONTACT_EMAIL && (
              <p className="muted">
                Create a WordPress page with the slug “{PAGE_SLUGS.contact}” to show your contact details here.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

function ContactForm({ formId }) {
  const [values, setValues] = useState({ 'your-name': '', 'your-email': '', 'your-subject': '', 'your-message': '' });
  const [state, setState] = useState({ sending: false, done: '', error: '' });

  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setState({ sending: true, done: '', error: '' });
    try {
      const message = await sendContactForm(formId, values);
      setState({ sending: false, done: message || 'Thank you for your message.', error: '' });
      setValues({ 'your-name': '', 'your-email': '', 'your-subject': '', 'your-message': '' });
    } catch (err) {
      setState({ sending: false, done: '', error: err.message });
    }
  };

  return (
    <form className="card contact-form" onSubmit={submit}>
      <h2>Send us a message</h2>
      {state.done && <p className="notice notice-success">{state.done}</p>}
      {state.error && <ErrorMessage error={state.error} title="Message not sent" />}
      <div className="form-grid">
        <Field label="Your name">
          <input required value={values['your-name']} onChange={set('your-name')} autoComplete="name" />
        </Field>
        <Field label="Your email">
          <input required type="email" value={values['your-email']} onChange={set('your-email')} autoComplete="email" />
        </Field>
        <Field label="Subject" className="span-2">
          <input required value={values['your-subject']} onChange={set('your-subject')} />
        </Field>
        <Field label="Message" className="span-2">
          <textarea required rows={5} value={values['your-message']} onChange={set('your-message')} />
        </Field>
      </div>
      <button type="submit" className="btn btn-primary btn-lg" disabled={state.sending}>
        {state.sending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
