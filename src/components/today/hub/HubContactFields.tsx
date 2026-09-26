import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";

export function HubContactFields({ vm }: { vm: TodayHubVm }) {
  const {
    contactName, setContactName, contactPhone, setContactPhone,
    contactCategory, setContactCategory, contactDesignation, setContactDesignation,
  } = vm.misc;

  return (
    <>
      <div className="field">
        <label htmlFor="ct-name">Name</label>
        <input id="ct-name" required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" />
      </div>
      <div className="field">
        <label htmlFor="ct-phone">Phone</label>
        <input id="ct-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone number" />
      </div>
      <div className="field">
        <label htmlFor="ct-category">Category</label>
        <input id="ct-category" value={contactCategory} onChange={(e) => setContactCategory(e.target.value)} placeholder="e.g. Pani Pipe" />
      </div>
      <div className="field">
        <label htmlFor="ct-designation">Designation</label>
        <input id="ct-designation" value={contactDesignation} onChange={(e) => setContactDesignation(e.target.value)} placeholder="e.g. Supplier" />
      </div>
    </>
  );
}
