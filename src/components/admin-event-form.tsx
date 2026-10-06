"use client";
import { useState } from "react";

export type EditableAdminEvent = { id: number; name: string; startDate: string; endDate: string; isPublished: boolean; details: string };

export function AdminEventForm({ csrf, date, event }: { csrf: string; date: string; event?: EditableAdminEvent }) {
  const [startDate, setStartDate] = useState(event?.startDate ?? date);
  const [endDate, setEndDate] = useState(event?.endDate ?? date);

  function changeStart(value: string) {
    // תאריך הסיום עוקב אחרי ההתחלה כל עוד לא הוגדר טווח, ולעולם אינו מוקדם ממנה
    if (endDate === startDate || endDate < value) setEndDate(value);
    setStartDate(value);
  }

  return (
    <form className="stack" method="post" action="/api/actions">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value={event ? "adminEventUpdate" : "adminEventCreate"} />
      {event && <input type="hidden" name="eventId" value={event.id} />}
      <div className="field"><label>שם האירוע<input className="input" name="name" required maxLength={150} defaultValue={event?.name} autoFocus /></label></div>
      <div className="field"><label>תאריך התחלה<input className="input" type="date" name="startDate" required value={startDate} onChange={e => changeStart(e.target.value)} /></label></div>
      <div className="field"><label>תאריך סיום<input className="input" type="date" name="endDate" required min={startDate} value={endDate} onChange={e => setEndDate(e.target.value)} /></label></div>
      <label className="checkbox-row">
        <input type="checkbox" name="isPublished" value="1" defaultChecked={event?.isPublished} />
        <span>פרסום לכל העובדים</span>
      </label>
      <div className="field"><label>פרטים<textarea className="input" name="details" maxLength={2000} defaultValue={event?.details} /></label></div>
      <button className="btn">{event ? "שמירת שינויים" : "יצירת אירוע"}</button>
    </form>
  );
}
