import { useSite } from '../context/SiteContext';

/** One labelled form field with an inline error message. */
export function Field({ label, error, required = true, children, className = '' }) {
  return (
    <label className={`field ${error ? 'has-error' : ''} ${className}`}>
      <span className="field-label">
        {label}
        {!required && <span className="muted"> (optional)</span>}
      </span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export const emptyAddress = (country = '') => ({
  first_name: '',
  last_name: '',
  address_1: '',
  address_2: '',
  city: '',
  state: '',
  postcode: '',
  country,
});

/**
 * Country / state aware address form used for billing and shipping.
 * If the optional helper plugin is installed we show real country and state
 * lists from WooCommerce; otherwise simple text inputs are shown.
 */
export default function AddressFields({ values, errors = {}, onChange, section = 'billing' }) {
  const { helper } = useSite();
  const countries = helper?.countries;
  const stateList = helper?.states?.[values.country];
  const stateOptional = helper?.state_optional?.includes(values.country);
  const postcodeOptional = helper?.postcode_optional?.includes(values.country);

  const set = (field) => (e) => onChange(field, e.target.value);
  const ac = (token) => `${section} ${token}`;

  return (
    <div className="form-grid">
      <Field label="First name" error={errors.first_name}>
        <input value={values.first_name} onChange={set('first_name')} autoComplete={ac('given-name')} />
      </Field>
      <Field label="Last name" error={errors.last_name}>
        <input value={values.last_name} onChange={set('last_name')} autoComplete={ac('family-name')} />
      </Field>

      <Field label="Country / Region" error={errors.country} className="span-2">
        {countries ? (
          <select
            value={values.country}
            onChange={(e) => {
              onChange('country', e.target.value);
              onChange('state', '');
            }}
            autoComplete={ac('country')}
          >
            <option value="">Select a country…</option>
            {Object.entries(countries).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={values.country}
            maxLength={2}
            placeholder="2-letter code, e.g. IN"
            onChange={(e) => onChange('country', e.target.value.toUpperCase())}
            autoComplete={ac('country')}
          />
        )}
      </Field>

      <Field label="Address" error={errors.address_1} className="span-2">
        <input
          value={values.address_1}
          placeholder="House number and street name"
          onChange={set('address_1')}
          autoComplete={ac('address-line1')}
        />
      </Field>
      <Field label="Apartment, suite, etc." required={false} className="span-2">
        <input value={values.address_2} onChange={set('address_2')} autoComplete={ac('address-line2')} />
      </Field>

      <Field label="Town / City" error={errors.city}>
        <input value={values.city} onChange={set('city')} autoComplete={ac('address-level2')} />
      </Field>

      {stateList ? (
        <Field label="State / County" error={errors.state} required={!stateOptional}>
          <select value={values.state} onChange={set('state')} autoComplete={ac('address-level1')}>
            <option value="">Select…</option>
            {Object.entries(stateList).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label="State / County" error={errors.state} required={false}>
          <input value={values.state} onChange={set('state')} autoComplete={ac('address-level1')} />
        </Field>
      )}

      <Field label="Postcode / PIN" error={errors.postcode} required={!postcodeOptional}>
        <input value={values.postcode} onChange={set('postcode')} autoComplete={ac('postal-code')} />
      </Field>
    </div>
  );
}
