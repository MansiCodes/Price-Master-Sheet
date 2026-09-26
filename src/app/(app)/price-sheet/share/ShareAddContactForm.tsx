"use client";

import { FormEvent } from "react";

type ShareAddContactFormProps = {
  newName: string;
  newPhone: string;
  sending: boolean;
  onNewNameChange: (value: string) => void;
  onNewPhoneChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
};

export function ShareAddContactForm({
  newName,
  newPhone,
  sending,
  onNewNameChange,
  onNewPhoneChange,
  onSubmit,
}: ShareAddContactFormProps) {
  return (
    <form className="ps-share-add" onSubmit={onSubmit}>
      <input
        type="text"
        placeholder="Name"
        value={newName}
        onChange={(e) => onNewNameChange(e.target.value)}
        maxLength={80}
        disabled={sending}
        aria-label="Name"
      />
      <input
        type="tel"
        inputMode="numeric"
        placeholder="Number (e.g. 9876543210)"
        value={newPhone}
        onChange={(e) => onNewPhoneChange(e.target.value)}
        maxLength={16}
        disabled={sending}
        aria-label="Mobile number"
      />
      <button type="submit" className="ps-btn ps-btn-secondary" disabled={sending}>
        Add
      </button>
    </form>
  );
}
