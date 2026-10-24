import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildExtraAccessOptions,
  buildExtraAccessValue,
  computeUserFormFlags,
} from "./user-form-modal-model";

const plants = [
  { id: "p1", name: "Quad", code: "QUAD", isActive: true },
];

describe("Viewer extra access", () => {
  it("does not lock Price Sheet or MP Admin, and includes Users", () => {
    const flags = computeUserFormFlags("VIEWER", false, ["p1"], plants);
    assert.equal(flags.priceSheetLocked, false);
    assert.equal(flags.mpAdminLocked, false);
    assert.equal(flags.showUsersExtra, true);

    const options = buildExtraAccessOptions({
      canAddMachineSupervise: flags.canAddMachineSupervise,
      priceSheetLocked: flags.priceSheetLocked,
      mpAdminLocked: flags.mpAdminLocked,
      selectedHasQuadSignal: flags.selectedHasQuadSignal,
      showUsersExtra: flags.showUsersExtra,
    });
    assert.deepEqual(
      options.map((o) => o.id),
      ["PRICE_SHEET", "MP_ADMIN", "STOCK", "USERS"],
    );
    assert.equal(options.find((o) => o.id === "PRICE_SHEET")?.locked, false);
    assert.equal(options.find((o) => o.id === "MP_ADMIN")?.locked, false);

    const empty = buildExtraAccessValue({
      canViewPriceSheet: false,
      canMachineSupervise: false,
      canAdminMachineProduction: false,
      canAccessStock: false,
      canManageUsers: false,
      canAddMachineSupervise: false,
      priceSheetLocked: false,
      mpAdminLocked: false,
      selectedHasQuadSignal: true,
      showUsersExtra: true,
    });
    assert.deepEqual(empty, []);
  });

  it("selects Users extra without Price Sheet or MP Admin", () => {
    const selected = buildExtraAccessValue({
      canViewPriceSheet: false,
      canMachineSupervise: false,
      canAdminMachineProduction: false,
      canAccessStock: false,
      canManageUsers: true,
      canAddMachineSupervise: false,
      priceSheetLocked: false,
      mpAdminLocked: false,
      selectedHasQuadSignal: true,
      showUsersExtra: true,
    });
    assert.deepEqual(selected, ["USERS"]);
  });
});
