import { useState } from "react";

export function useTodayHubMiscContact() {
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactCategory, setContactCategory] = useState("");
  const [contactDesignation, setContactDesignation] = useState("");
  const [pettyNature, setPettyNature] = useState("");
  const [pettyPerson, setPettyPerson] = useState("");
  const [pettyLocation, setPettyLocation] = useState("");
  const [pettyCheckedBy, setPettyCheckedBy] = useState("");
  const [pettyApprovedBy, setPettyApprovedBy] = useState("");
  return {
    contactName, setContactName, contactPhone, setContactPhone,
    contactCategory, setContactCategory, contactDesignation, setContactDesignation,
    pettyNature, setPettyNature, pettyPerson, setPettyPerson,
    pettyLocation, setPettyLocation, pettyCheckedBy, setPettyCheckedBy,
    pettyApprovedBy, setPettyApprovedBy,
  };
}
