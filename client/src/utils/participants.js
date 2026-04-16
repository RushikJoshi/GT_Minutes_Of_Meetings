export function participantToLabel(p) {
  if (!p) return "";
  if (typeof p === "string") return p;
  const name = String(p.name || "").trim();
  const email = String(p.email || "").trim();
  if (name && email) return `${name} <${email}>`;
  return name || email;
}

export function participantsToLabels(participants) {
  if (!Array.isArray(participants)) return [];
  return participants.map(participantToLabel).filter(Boolean);
}

