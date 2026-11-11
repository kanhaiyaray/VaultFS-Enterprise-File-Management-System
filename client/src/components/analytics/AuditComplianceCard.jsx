import { CheckCircle2, XCircle } from "lucide-react";
import { Card } from "./AnalyticsUI";

export default function AuditComplianceCard() {
  const checks = [
    { label: "Audit logging enabled",      passed: true,  hint: "Activity collection active" },
    { label: "Data retention configured",  passed: true,  hint: "Activity & files indexed" },
    { label: "GDPR-ready data export",     passed: true,  hint: "Via /api/users/me/export" },
    { label: "2FA available to all users", passed: true,  hint: "TOTP built-in" },
    { label: "Encryption at rest",         passed: false, hint: "Configure AES key to enable" },
  ];
  return (
    <Card title="Audit & Compliance" subtitle="System configuration snapshot">
      <div className="space-y-1.5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-start gap-2 text-xs py-1">
            {c.passed ? <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0 mt-0.5" /> : <XCircle size={11} className="text-gray-600 flex-shrink-0 mt-0.5" />}
            <div className="min-w-0">
              <p className={c.passed ? "text-gray-300" : "text-gray-500"}>{c.label}</p>
              <p className="text-[10px] text-gray-600">{c.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
