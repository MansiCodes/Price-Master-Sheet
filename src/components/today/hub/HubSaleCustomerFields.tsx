import { SelectMenu } from "@/components/ui/SelectMenu";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";

function onCustomerChange(vm: TodayHubVm, next: string) {
  vm.sale.setCustomerName(next);
  if (next !== "Other" && next !== "Others") vm.sale.setCustomerNameOther("");
}

export function HubSaleCustomerSelect({
  vm,
  label,
}: {
  vm: TodayHubVm;
  label: string;
}) {
  const { customerName } = vm.sale;
  const { cat6CustomerOptions } = vm.catalogs;
  return (
    <div className="field field--wide">
      <label htmlFor="s-cust">{label}</label>
      <SelectMenu
        id="s-cust"
        value={customerName}
        options={cat6CustomerOptions}
        required
        onChange={(next) => onCustomerChange(vm, next)}
      />
    </div>
  );
}

function HubSaleTypeField({ vm }: { vm: TodayHubVm }) {
  const { saleTypeOptions } = vm.flags;
  const { saleType, setSaleType, setSaleTypeOther } = vm.sale;
  return (
    <div className="field">
      <label htmlFor="s-type">Type</label>
      <SelectMenu
        id="s-type"
        value={saleTypeOptions.find((t) => t.value === saleType)?.label ?? saleTypeOptions[0]?.label ?? "Finished Good"}
        options={saleTypeOptions.map((t) => t.label)}
        required
        onChange={(label) => {
          const next = saleTypeOptions.find((t) => t.label === label);
          if (next) {
            setSaleType(next.value);
            if (next.value !== "OTHERS") setSaleTypeOther("");
          }
        }}
      />
    </div>
  );
}

export function HubSaleTypeCustomerRow({ vm }: { vm: TodayHubVm }) {
  const { customerName } = vm.sale;
  const { cat6CustomerOptions } = vm.catalogs;
  return (
    <div className="form-grid two">
      <HubSaleTypeField vm={vm} />
      <div className="field">
        <label htmlFor="s-cust">Customer</label>
        <SelectMenu
          id="s-cust"
          value={customerName}
          options={cat6CustomerOptions}
          required
          onChange={(next) => onCustomerChange(vm, next)}
        />
      </div>
    </div>
  );
}

export function HubSaleCustomerOther({ vm }: { vm: TodayHubVm }) {
  const { customerName, customerNameOther, setCustomerNameOther } = vm.sale;
  if (customerName !== "Other" && customerName !== "Others") return null;
  return (
    <div className="field">
      <label htmlFor="s-cust-other">
        Customer Name <span style={{ color: "red" }}>*</span>
      </label>
      <input
        id="s-cust-other"
        required
        placeholder="Enter customer name"
        value={customerNameOther}
        onChange={(e) => setCustomerNameOther(e.target.value)}
      />
    </div>
  );
}

export function HubSaleTypeOther({ vm }: { vm: TodayHubVm }) {
  const { isCat6, isPvc } = vm.flags;
  const { saleType, saleTypeOther, setSaleTypeOther } = vm.sale;
  if (isCat6 || isPvc || saleType !== "OTHERS") return null;
  return (
    <div className="field">
      <label htmlFor="s-type-other">Other type</label>
      <input
        id="s-type-other"
        required
        placeholder="Specify sales type"
        value={saleTypeOther}
        onChange={(e) => setSaleTypeOther(e.target.value)}
      />
    </div>
  );
}

export function HubSaleCustomerBlock({ vm }: { vm: TodayHubVm }) {
  if (vm.flags.isCat6) return <HubSaleCustomerSelect vm={vm} label="Customer Name" />;
  if (vm.flags.isPvc) return <HubSaleCustomerSelect vm={vm} label="Customer" />;
  return <HubSaleTypeCustomerRow vm={vm} />;
}
