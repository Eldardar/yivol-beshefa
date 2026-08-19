import Link from "next/link";
import { ArrowLeftIcon, CheckCircleIcon, CircleIcon } from "./icons";

type OnboardingStep = {
  key: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
};

export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const doneCount = steps.filter(s => s.done).length;
  if (doneCount === steps.length) return null;
  const percent = Math.round((doneCount / steps.length) * 100);

  return (
    <section className="card onboarding-card">
      <div className="page-header">
        <h2>צעדים ראשונים</h2>
        <span className="muted">{doneCount}/{steps.length} הושלמו</span>
      </div>
      <div className="progress-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <ul className="onboarding-steps">
        {steps.map(step => (
          <li key={step.key} className={step.done ? "onboarding-step done" : "onboarding-step"}>
            <Link href={step.href} className="onboarding-step-link">
              {step.done ? (
                <CheckCircleIcon size={20} className="onboarding-step-icon" />
              ) : (
                <CircleIcon size={20} className="onboarding-step-icon" />
              )}
              <span className="onboarding-step-body">
                <span className="onboarding-step-title">{step.title}</span>
                <span className="muted">{step.description}</span>
              </span>
              <ArrowLeftIcon size={16} className="onboarding-step-arrow" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
