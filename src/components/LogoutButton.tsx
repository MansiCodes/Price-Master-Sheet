import { logoutAction } from "@/app/actions/auth";

export function LogoutButton() {
  return (
    <form action={logoutAction} className="dash-header__logout-form">
      <button type="submit" className="dash-header__logout">
        Logout
      </button>
    </form>
  );
}
