import { A4Preview } from "../A4Preview";
import { collectionPages, parentSlipPages } from "@/services/collectionForms";
import type { SchoolSettings, StaffMember } from "@/types/school";

function CollectionHeader({ settings }: { settings: SchoolSettings }) {
  return <header className="collection-header">
    <div className="collection-school-logo">{settings.logoDataUrl && <img src={settings.logoDataUrl} alt="School logo" />}</div>
    <div className="collection-school-name"><h1>{settings.name}</h1>{settings.arabicName && <p dir="rtl">{settings.arabicName}</p>}<p>{settings.address}</p></div>
    <div className="collection-ndh-logo"><img src="/images/ndh-logo-gateway-cropped.png" alt="NDH SchoolOS logo" /><strong>NDH SchoolOS</strong></div>
  </header>;
}

export function PrintableStaffCollection({ settings, staff }: { settings: SchoolSettings; staff: StaffMember[] }) {
  const rows = staff.length ? staff : Array.from({ length: 18 }, () => null);
  const pages = collectionPages(rows, 18);
  const groupLabel = settings.enableQuranModule ? "Halqah" : settings.labels.classSingular;
  return <div className="collection-pages">{pages.map((page, pageIndex) => <A4Preview key={pageIndex}><section className="report-a4-page collection-staff-page">
    <CollectionHeader settings={settings} />
    <h2>STAFF ROLE &amp; PHONE COLLECTION SHEET</h2>
    <p className="collection-note">Write clearly. Give one active phone number. Tick one teaching role.</p>
    <table className="collection-staff-table"><colgroup><col className="collection-number-col" /><col className="collection-name-col" /><col className="collection-phone-col" /><col className="collection-group-col" /><col className="collection-role-col" /><col className="collection-sign-col" /></colgroup>
      <thead><tr><th>S/N</th><th>Full name</th><th>Active phone number</th><th>Assigned {groupLabel}</th><th>Role (tick one)</th><th>Signature</th></tr></thead>
      <tbody>{page.map((member, rowIndex) => <tr key={member?.id ?? rowIndex}><td>{pageIndex * 18 + rowIndex + 1}</td><td>{member?.fullName ?? ""}</td><td></td><td></td><td><div>☐ {groupLabel} teacher</div><div>☐ Subject teacher</div><div>☐ Both</div></td><td></td></tr>)}</tbody>
    </table>
    <footer className="collection-page-footer">Page {pageIndex + 1} of {pages.length}</footer>
  </section></A4Preview>)}</div>;
}

function ParentSlip({ settings }: { settings: SchoolSettings }) {
  return <article className="collection-parent-slip">
    <CollectionHeader settings={settings} />
    <h2>LEARNER &amp; PARENT VERIFICATION SLIP</h2>
    <div className="collection-name-notice"><strong>PLEASE CHECK THE LEARNER’S FULL NAME CAREFULLY.</strong><p>Write clearly in CAPITAL LETTERS, exactly as it should appear on report sheets and certificates. Check every name and spelling before signing to avoid corrections later.</p></div>
    <div className="collection-field"><strong>Learner’s full name (CAPITAL LETTERS):</strong><span /></div>
    <div className="collection-inline-fields"><span><strong>Gender:</strong> ☐ Male &nbsp; ☐ Female</span><span><strong>Date of birth:</strong> ____ / ____ / ________</span></div>
    <div className="collection-field"><strong>Parent / guardian full name:</strong><span /></div>
    <div className="collection-field"><strong>Phone / WhatsApp number:</strong><span /></div>
    <p className="collection-phone-note">This number will be used for your parent portal login.</p>
    <div className="collection-inline-fields"><span><strong>Parent signature:</strong> __________________</span><span><strong>Date:</strong> ______________</span></div>
  </article>;
}

export function PrintableParentSlips({ settings, count }: { settings: SchoolSettings; count: number }) {
  return <div className="collection-pages">{parentSlipPages(count).map((page, i) => <A4Preview key={i}><section className="report-a4-page collection-parent-page">{page.map((n) => <ParentSlip key={n} settings={settings} />)}</section></A4Preview>)}</div>;
}