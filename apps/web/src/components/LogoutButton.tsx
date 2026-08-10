import { logoutAction } from "@/app/actions/auth";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="dash-header__logout">
        Logout
      </button>
    </form>
  );
}
