import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useMe } from "@/lib/me";
import { supabase } from "@/integrations/supabase/client-untyped";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Phone,
  Plus,
  Upload,
  Play,
  Pause,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Voicemail,
  Calendar,
  Users,
  PhoneCall,
  PhoneOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/_authenticated/dashboard/campaigns"
)({
  component: CampaignsPage,
});

const CAMPAIGN_TEMPLATES = [
  {
    id: "service_reminder",
    label: "Service Reminder",
    description: "Remind past customers it's time for their next service",
    script:
      "Hi, this is an automated message from [Business Name]. We wanted to reach out because it's been a while since your last visit, and we'd love to help you with your next service. Would you be interested in scheduling an appointment?",
  },
  {
    id: "oil_change",
    label: "Oil Change Reminder",
    description: "Specifically remind customers about oil change intervals",
    script:
      "Hi, this is [Business Name] calling. Based on your last visit, your vehicle may be due for an oil change. We have availability this week and would love to take care of you. Can we get you scheduled?",
  },
  {
    id: "review_request",
    label: "Review Request",
    description: "Follow up with satisfied customers to leave a review",
    script:
      "Hi, this is [Business Name]. We recently had the pleasure of servicing your vehicle and wanted to follow up to make sure everything is running great. If you were happy with your experience, we'd really appreciate a quick review online. It means a lot to our small business.",
  },
  {
    id: "seasonal_special",
    label: "Seasonal Special",
    description: "Promote a seasonal offer or discount to past customers",
    script:
      "Hi, this is [Business Name] with an exclusive offer for our valued customers. We're running a special this season on [service type] and wanted to make sure you heard about it first. Would you like to take advantage of this limited-time offer?",
  },
  {
    id: "reactivation",
    label: "Customer Reactivation",
    description: "Win back customers who haven't visited in 6+ months",
    script:
      "Hi, this is [Business Name]. We noticed it's been a while since we've seen you, and we miss you! We'd love to earn your business back. We have some great deals available for returning customers. Can we help you with anything today?",
  },
  {
    id: "custom",
    label: "Custom Script",
    description: "Write your own AI conversation script",
    script: "",
  },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Draft",
    color: "bg-gray-100 text-gray-700",
    icon: <Clock className="h-3 w-3" />,
  },
  scheduled: {
    label: "Scheduled",
    color: "bg-blue-100 text-blue-700",
    icon: <Calendar className="h-3 w-3" />,
  },
  running: {
    label: "Running",
    color: "bg-green-100 text-green-700",
    icon: <Play className="h-3 w-3" />,
  },
  paused: {
    label: "Paused",
    color: "bg-yellow-100 text-yellow-700",
    icon: <Pause className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    color: "bg-purple-100 text-purple-700",
    icon: <CheckCircle className="h-3 w-3" />,
  },
};

const CALL_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    color: "bg-gray-100 text-gray-600",
    icon: <Clock className="h-3 w-3" />,
  },
  calling: {
    label: "Calling",
    color: "bg-blue-100 text-blue-700",
    icon: <PhoneCall className="h-3 w-3" />,
  },
  answered: {
    label: "Answered",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  voicemail: {
    label: "Voicemail",
    color: "bg-yellow-100 text-yellow-700",
    icon: <Voicemail className="h-3 w-3" />,
  },
  no_answer: {
    label: "No Answer",
    color: "bg-orange-100 text-orange-700",
    icon: <PhoneOff className="h-3 w-3" />,
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-700",
    icon: <XCircle className="h-3 w-3" />,
  },
  booked: {
    label: "Booked",
    color: "bg-emerald-100 text-emerald-700",
    icon: <Calendar className="h-3 w-3" />,
  },
};

function CampaignsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const isSuper = me.profile.role === "super_admin";
  const tenantId = me.tenant?.id;

  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [expandedContacts, setExpandedContacts] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    template: "service_reminder",
    ai_script: CAMPAIGN_TEMPLATES[0].script,
    caller_id: "",
  });
  const [csvContacts, setCsvContacts] = useState<
    Array<{
      first_name: string;
      last_name: string;
      phone: string;
      email: string;
      last_service_date: string;
      vehicle_info: string;
      notes: string;
    }>
  >([]);

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", tenantId],
    queryFn: async () => {
      let q = supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (!isSuper && tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!me,
  });

  // Fetch contacts for selected campaign
  const { data: contacts = [] } = useQuery({
    queryKey: ["campaign_contacts", expandedContacts],
    queryFn: async () => {
      if (!expandedContacts) return [];
      const { data, error } = await supabase
        .from("campaign_contacts")
        .select("*")
        .eq("campaign_id", expandedContacts)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!expandedContacts,
  });

  // Create campaign mutation
  const createCampaign = useMutation({
    mutationFn: async () => {
      const { data: camp, error: campErr } = await supabase
        .from("campaigns")
        .insert({
          tenant_id: tenantId,
          name: form.name,
          description: form.description,
          template: form.template,
          ai_script: form.ai_script,
          caller_id: form.caller_id,
          total_contacts: csvContacts.length,
          status: "draft",
        })
        .select()
        .single();
      if (campErr) throw campErr;

      if (csvContacts.length > 0) {
        const rows = csvContacts.map((c) => ({
          ...c,
          campaign_id: camp.id,
          tenant_id: tenantId,
        }));
        const { error: contErr } = await supabase
          .from("campaign_contacts")
          .insert(rows);
        if (contErr) throw contErr;
      }
      return camp;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign created successfully");
      setShowCreate(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Update campaign status
  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "running") updates.started_at = new Date().toISOString();
      if (status === "completed") updates.completed_at = new Date().toISOString();
      const { error } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete campaign
  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
      if (selectedCampaign) setSelectedCampaign(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function resetForm() {
    setForm({
      name: "",
      description: "",
      template: "service_reminder",
      ai_script: CAMPAIGN_TEMPLATES[0].script,
      caller_id: "",
    });
    setCsvContacts([]);
    setStep(1);
  }

  function handleTemplateChange(templateId: string) {
    const t = CAMPAIGN_TEMPLATES.find((x) => x.id === templateId);
    setForm((f) => ({
      ...f,
      template: templateId,
      ai_script: t?.script ?? "",
    }));
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least one contact");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => (obj[h] = vals[i] ?? ""));
        return {
          first_name: obj.first_name ?? obj.firstname ?? obj.first ?? "",
          last_name: obj.last_name ?? obj.lastname ?? obj.last ?? "",
          phone: obj.phone ?? obj.phone_number ?? obj.mobile ?? "",
          email: obj.email ?? "",
          last_service_date: obj.last_service_date ?? obj.last_service ?? obj.date ?? "",
          vehicle_info: obj.vehicle_info ?? obj.vehicle ?? obj.car ?? "",
          notes: obj.notes ?? obj.note ?? "",
        };
      }).filter((r) => r.phone);
      setCsvContacts(rows);
      toast.success(`Loaded ${rows.length} contacts from CSV`);
    };
    reader.readAsText(file);
  }

  // Stats
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "running").length;
  const totalCallsMade = campaigns.reduce((s, c) => s + (c.calls_made ?? 0), 0);
  const totalBooked = campaigns.reduce((s, c) => s + (c.appointments_booked ?? 0), 0);

  const selectedTemplate = CAMPAIGN_TEMPLATES.find((t) => t.id === form.template);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Outbound Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a contact list and let the AI call your past customers automatically
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Campaigns", value: totalCampaigns, icon: <Phone className="h-5 w-5 text-blue-500" /> },
          { label: "Active Now", value: activeCampaigns, icon: <Play className="h-5 w-5 text-green-500" /> },
          { label: "Calls Made", value: totalCallsMade, icon: <PhoneCall className="h-5 w-5 text-purple-500" /> },
          { label: "Appointments Booked", value: totalBooked, icon: <Calendar className="h-5 w-5 text-emerald-500" /> },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                {kpi.icon}
              </div>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Create your first outbound campaign to start having the AI call your past customers automatically.
            </p>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const statusCfg = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft;
            const answerRate =
              campaign.calls_made > 0
                ? Math.round((campaign.calls_answered / campaign.calls_made) * 100)
                : 0;
            const bookRate =
              campaign.calls_answered > 0
                ? Math.round((campaign.appointments_booked / campaign.calls_answered) * 100)
                : 0;
            const isExpanded = expandedContacts === campaign.id;

            return (
              <Card key={campaign.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Campaign Row */}
                  <div className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{campaign.name}</span>
                        <Badge className={`text-xs gap-1 ${statusCfg.color}`}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {CAMPAIGN_TEMPLATES.find((t) => t.id === campaign.template)?.label ?? campaign.template}
                        </Badge>
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">{campaign.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {campaign.total_contacts} contacts
                        </span>
                        <span className="flex items-center gap-1">
                          <PhoneCall className="h-3 w-3" />
                          {campaign.calls_made} called
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {answerRate}% answer rate
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-emerald-500" />
                          {campaign.appointments_booked} booked ({bookRate}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {campaign.total_contacts > 0 && (
                      <div className="w-full md:w-32">
                        <div className="text-xs text-muted-foreground mb-1 text-right">
                          {campaign.calls_made}/{campaign.total_contacts}
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.round((campaign.calls_made / campaign.total_contacts) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {campaign.status === "draft" && (
                        <Button
                          size="sm"
                          className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => updateStatus.mutate({ id: campaign.id, status: "running" })}
                        >
                          <Play className="h-3 w-3" />
                          Launch
                        </Button>
                      )}
                      {campaign.status === "running" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => updateStatus.mutate({ id: campaign.id, status: "paused" })}
                        >
                          <Pause className="h-3 w-3" />
                          Pause
                        </Button>
                      )}
                      {campaign.status === "paused" && (
                        <Button
                          size="sm"
                          className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => updateStatus.mutate({ id: campaign.id, status: "running" })}
                        >
                          <Play className="h-3 w-3" />
                          Resume
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() =>
                          setExpandedContacts(isExpanded ? null : campaign.id)
                        }
                      >
                        <Eye className="h-3 w-3" />
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm("Delete this campaign and all its contacts?")) {
                            deleteCampaign.mutate(campaign.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded contact list */}
                  {isExpanded && (
                    <div className="border-t bg-muted/30">
                      <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Contact List — {contacts.length} contacts
                      </div>
                      {contacts.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                          No contacts in this campaign yet
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Name</TableHead>
                                <TableHead className="text-xs">Phone</TableHead>
                                <TableHead className="text-xs">Vehicle</TableHead>
                                <TableHead className="text-xs">Last Service</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs">Outcome</TableHead>
                                <TableHead className="text-xs">Called At</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {contacts.map((c) => {
                                const callCfg =
                                  CALL_STATUS_CONFIG[c.call_status] ??
                                  CALL_STATUS_CONFIG.pending;
                                return (
                                  <TableRow key={c.id}>
                                    <TableCell className="text-xs font-medium">
                                      {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                                    </TableCell>
                                    <TableCell className="text-xs">{c.phone}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {c.vehicle_info || "—"}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {c.last_service_date || "—"}
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={`text-xs gap-1 ${callCfg.color}`}>
                                        {callCfg.icon}
                                        {callCfg.label}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {c.call_outcome || "—"}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {c.called_at
                                        ? new Date(c.called_at).toLocaleString()
                                        : "—"}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Outbound Campaign</DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step >= s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s}
                </div>
                <span className={`text-xs ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                  {s === 1 ? "Details" : s === 2 ? "Script" : "Contacts"}
                </span>
                {s < 3 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </div>

          {/* Step 1: Campaign Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="camp-name">Campaign Name *</Label>
                <Input
                  id="camp-name"
                  placeholder="e.g. Summer Oil Change Reminder"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="camp-desc">Description (optional)</Label>
                <Input
                  id="camp-desc"
                  placeholder="Internal notes about this campaign"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Campaign Template</Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {CAMPAIGN_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTemplateChange(t.id)}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        form.template === t.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="font-medium text-sm">{t.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: AI Script */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <strong>How it works:</strong> The AI will use this script as a starting point and adapt the conversation based on how the customer responds. Replace <code>[Business Name]</code> with your actual business name.
              </div>
              <div>
                <Label htmlFor="ai-script">AI Conversation Script</Label>
                <Textarea
                  id="ai-script"
                  rows={8}
                  value={form.ai_script}
                  onChange={(e) => setForm((f) => ({ ...f, ai_script: e.target.value }))}
                  placeholder="Write what the AI should say when the customer picks up..."
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The AI will handle objections, answer basic questions, and guide the conversation toward booking an appointment.
                </p>
              </div>
              <div>
                <Label htmlFor="caller-id">Caller ID Number (optional)</Label>
                <Input
                  id="caller-id"
                  placeholder="+1 (555) 000-0000"
                  value={form.caller_id}
                  onChange={(e) => setForm((f) => ({ ...f, caller_id: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank to use your default Vektiss number. Enter your business number to show your actual caller ID.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Upload Contacts */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                <strong>CSV Format:</strong> Your file should have columns for <code>first_name</code>, <code>last_name</code>, <code>phone</code>, and optionally <code>email</code>, <code>vehicle_info</code>, <code>last_service_date</code>, <code>notes</code>.
              </div>

              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Click to upload CSV file</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .csv files up to 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCsvUpload}
                />
              </div>

              {csvContacts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700">
                      ✓ {csvContacts.length} contacts loaded
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setCsvContacts([])}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs">Phone</TableHead>
                          <TableHead className="text-xs">Vehicle</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvContacts.slice(0, 20).map((c, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">
                              {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                            </TableCell>
                            <TableCell className="text-xs">{c.phone}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {c.vehicle_info || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {csvContacts.length > 20 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-xs text-center text-muted-foreground">
                              +{csvContacts.length - 20} more contacts
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                You can also create the campaign without contacts and add them later.
              </p>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : setShowCreate(false)}
            >
              {step > 1 ? "Back" : "Cancel"}
            </Button>
            <div className="flex gap-2">
              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && !form.name.trim()}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={() => createCampaign.mutate()}
                  disabled={createCampaign.isPending || !form.name.trim()}
                >
                  {createCampaign.isPending ? "Creating..." : "Create Campaign"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
