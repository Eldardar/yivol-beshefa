"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { ScheduleNotificationModal, type NotifiableUser } from "./schedule-notification-modal";

export function ScheduleNotificationButton({ users, csrf }: { users: NotifiableUser[]; csrf: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn secondary" onClick={() => setOpen(true)}>שליחת הודעה מותאמת אישית / תזמון</button>
      {open && (
        <Modal title="הודעה מותאמת אישית" onClose={() => setOpen(false)}>
          <ScheduleNotificationModal users={users} csrf={csrf} onClose={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}
