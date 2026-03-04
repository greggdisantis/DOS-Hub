import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import {
  PreconFormData,
  defaultFormData,
  defaultWorkItem,
} from "./types";
import {
  CheckboxRow,
  YNToggle,
  Field,
  SectionHeader,
  AccessoryRow,
  WorkItemBlock,
} from "./components";

const TABS = [
  { key: "info", label: "Info" },
  { key: "struxure", label: "StruXure" },
  { key: "decorative", label: "Decorative" },
  { key: "pergola", label: "Pergola" },
  { key: "expectations", label: "Expectations" },
  { key: "photos", label: "Photos" },
  { key: "materials", label: "Materials" },
  { key: "work", label: "Work Items" },
  { key: "notes", label: "Notes" },
  { key: "signatures", label: "Signatures" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function PreconDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const checklistId = parseInt(id ?? "0", 10);
  const router = useRouter();
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: checklist, refetch } = trpc.precon.get.useQuery({ id: checklistId }, { enabled: checklistId > 0 });
  const updateMutation = trpc.precon.update.useMutation();
  const generatePdfMutation = trpc.precon.generatePdf.useMutation();

  // Local form state
  const [projectName, setProjectName] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [formData, setFormData] = useState<PreconFormData>(defaultFormData());

  // Populate from server data
  useEffect(() => {
    if (checklist) {
      setProjectName(checklist.projectName ?? "");
      setProjectAddress(checklist.projectAddress ?? "");
      setMeetingDate(checklist.meetingDate ?? "");
      if (checklist.formData && typeof checklist.formData === "object") {
        setFormData({ ...defaultFormData(), ...(checklist.formData as any) });
      }
    }
  }, [checklist]);

  // Auto-save with debounce
  const scheduleAutoSave = useCallback(
    (newFormData: PreconFormData, newProjectName?: string, newProjectAddress?: string, newMeetingDate?: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          await updateMutation.mutateAsync({
            id: checklistId,
            projectName: newProjectName ?? projectName,
            projectAddress: newProjectAddress ?? projectAddress,
            meetingDate: newMeetingDate ?? meetingDate,
            formData: newFormData as any,
          });
        } catch (e) {
          // silent fail on auto-save
        } finally {
          setSaving(false);
        }
      }, 1200);
    },
    [checklistId, projectName, projectAddress, meetingDate, updateMutation],
  );

  const updateFormData = useCallback(
    (updater: (prev: PreconFormData) => PreconFormData) => {
      setFormData((prev) => {
        const next = updater(prev);
        scheduleAutoSave(next);
        return next;
      });
    },
    [scheduleAutoSave],
  );

  const handleGeneratePdf = async () => {
    // Save first
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        id: checklistId,
        projectName,
        projectAddress,
        meetingDate,
        formData: formData as any,
      });
    } catch (e) {}
    setSaving(false);

    setPdfLoading(true);
    try {
      const result = await generatePdfMutation.mutateAsync({ id: checklistId });
      const pdfUrl = `data:application/pdf;base64,${result.base64}`;
      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = `precon-${projectName || checklistId}.pdf`;
        link.click();
      } else {
        Alert.alert("PDF Ready", "The PDF has been generated.", [{ text: "OK" }]);
      }
    } catch (err: any) {
      Alert.alert("PDF Error", err.message ?? "Could not generate PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    try {
      await updateMutation.mutateAsync({ id: checklistId, status: "completed", formData: formData as any });
      await refetch();
      Alert.alert("Marked Complete", "This checklist has been marked as completed.");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const status = checklist?.status ?? "draft";
  const isReadOnly = status === "signed";

  const renderTabContent = () => {
    switch (activeTab) {
      case "info":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <SectionHeader title="Project Information" />
            <Field
              label="Project Name"
              value={projectName}
              onChangeText={(v) => {
                setProjectName(v);
                scheduleAutoSave(formData, v, projectAddress, meetingDate);
              }}
              placeholder="Enter project name"
              required
            />
            <Field
              label="Project Address"
              value={projectAddress}
              onChangeText={(v) => {
                setProjectAddress(v);
                scheduleAutoSave(formData, projectName, v, meetingDate);
              }}
              placeholder="Street address"
            />
            <Field
              label="Meeting Date"
              value={meetingDate}
              onChangeText={(v) => {
                setMeetingDate(v);
                scheduleAutoSave(formData, projectName, projectAddress, v);
              }}
              placeholder="MM/DD/YYYY"
            />
            {checklist?.supervisorName && (
              <View style={[styles.infoRow, { borderColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Project Supervisor</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{checklist.supervisorName}</Text>
              </View>
            )}
            <View style={[styles.infoRow, { borderColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: status === "signed" ? colors.success + "20" : status === "completed" ? colors.primary + "20" : colors.warning + "20" }]}>
                <Text style={[styles.statusText, { color: status === "signed" ? colors.success : status === "completed" ? colors.primary : colors.warning }]}>
                  {status.toUpperCase()}
                </Text>
              </View>
            </View>
            {status === "draft" && (
              <TouchableOpacity
                style={[styles.completeBtn, { backgroundColor: colors.primary }]}
                onPress={handleMarkComplete}
                activeOpacity={0.8}
              >
                <Text style={styles.completeBtnText}>Mark as Completed</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        );

      case "struxure":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <SectionHeader title="General Checklist" />
            <CheckboxRow
              label="Project Payment outline is reviewed and start of work payment collected as per contract"
              checked={formData.paymentReviewed}
              onToggle={() => updateFormData((p) => ({ ...p, paymentReviewed: !p.paymentReviewed }))}
            />
            <CheckboxRow
              label="Review Plan and all components"
              checked={formData.planReviewed}
              onToggle={() => updateFormData((p) => ({ ...p, planReviewed: !p.planReviewed }))}
            />
            <CheckboxRow
              label="Discuss Future Optional Add-ons to ensure provisions are in place"
              checked={formData.futureAddOnsDiscussed}
              onToggle={() => updateFormData((p) => ({ ...p, futureAddOnsDiscussed: !p.futureAddOnsDiscussed }))}
            />
            <CheckboxRow
              label="Area of installation to be clear of obstacles prior to start of work"
              checked={formData.siteWillBeClear}
              onToggle={() => updateFormData((p) => ({ ...p, siteWillBeClear: !p.siteWillBeClear }))}
            />
            <Field
              label="Location of Material Drop Off"
              value={formData.materialDropOffLocation}
              onChangeText={(v) => updateFormData((p) => ({ ...p, materialDropOffLocation: v }))}
              placeholder="e.g. Driveway, side gate..."
            />
            <Field
              label="Location of Work Staging Area"
              value={formData.stagingAreaLocation}
              onChangeText={(v) => updateFormData((p) => ({ ...p, stagingAreaLocation: v }))}
              placeholder="e.g. Backyard, garage..."
            />

            <SectionHeader title="StruXure Details" />
            <Field
              label="# of StruXure Zones"
              value={formData.struxureZones}
              onChangeText={(v) => updateFormData((p) => ({ ...p, struxureZones: v }))}
              placeholder="e.g. 2"
            />
            <Field
              label="Control Box Location"
              value={formData.controlBoxLocation}
              onChangeText={(v) => updateFormData((p) => ({ ...p, controlBoxLocation: v }))}
              placeholder="Location"
            />
            <Field
              label="Rain Sensor Location"
              value={formData.rainSensorLocation}
              onChangeText={(v) => updateFormData((p) => ({ ...p, rainSensorLocation: v }))}
              placeholder="Location (if applicable)"
            />
            <Field
              label="Wind Sensor Location"
              value={formData.windSensorLocation}
              onChangeText={(v) => updateFormData((p) => ({ ...p, windSensorLocation: v }))}
              placeholder="Location (if applicable)"
            />

            <SectionHeader title="Accessories (Qty & Location)" />
            {(
              [
                { key: "accessoryBeams", label: "Accessory Beam(s)" },
                { key: "receptacles", label: "Add. Receptacle(s)" },
                { key: "motorizedScreens", label: "Motorized Screen(s)" },
                { key: "sconceLighting", label: "Sconce Lighting" },
                { key: "systemDownspouts", label: "System Downspouts" },
              ] as const
            ).map(({ key, label }) => (
              <AccessoryRow
                key={key}
                label={label}
                checked={formData.accessories[key].checked}
                qty={formData.accessories[key].qty}
                location={formData.accessories[key].location}
                onToggle={() =>
                  updateFormData((p) => ({
                    ...p,
                    accessories: { ...p.accessories, [key]: { ...p.accessories[key], checked: !p.accessories[key].checked } },
                  }))
                }
                onQtyChange={(v) =>
                  updateFormData((p) => ({
                    ...p,
                    accessories: { ...p.accessories, [key]: { ...p.accessories[key], qty: v } },
                  }))
                }
                onLocationChange={(v) =>
                  updateFormData((p) => ({
                    ...p,
                    accessories: { ...p.accessories, [key]: { ...p.accessories[key], location: v } },
                  }))
                }
              />
            ))}
            {(["lights", "fans", "heaters"] as const).map((key) => {
              const labels: Record<string, string> = { lights: "Light(s)", fans: "Fan(s)", heaters: "Heater(s)" };
              return (
                <AccessoryRow
                  key={key}
                  label={labels[key]}
                  checked={formData.accessories[key].checked}
                  qty={formData.accessories[key].qty}
                  location={formData.accessories[key].location}
                  switchLocation={(formData.accessories[key] as any).switchLocation}
                  onToggle={() =>
                    updateFormData((p) => ({
                      ...p,
                      accessories: { ...p.accessories, [key]: { ...p.accessories[key], checked: !p.accessories[key].checked } },
                    }))
                  }
                  onQtyChange={(v) =>
                    updateFormData((p) => ({
                      ...p,
                      accessories: { ...p.accessories, [key]: { ...p.accessories[key], qty: v } },
                    }))
                  }
                  onLocationChange={(v) =>
                    updateFormData((p) => ({
                      ...p,
                      accessories: { ...p.accessories, [key]: { ...p.accessories[key], location: v } },
                    }))
                  }
                  onSwitchChange={(v) =>
                    updateFormData((p) => ({
                      ...p,
                      accessories: { ...p.accessories, [key]: { ...p.accessories[key], switchLocation: v } },
                    }))
                  }
                />
              );
            })}
          </ScrollView>
        );

      case "decorative":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <SectionHeader title="Decorative Features" />
            <Text style={[styles.hint, { color: colors.muted }]}>Toggle each feature Y/N as applicable for this project.</Text>
            {(
              [
                { key: "postBases", label: "Post Bases" },
                { key: "postCapitals", label: "Post Capitals" },
                { key: "postWraps", label: "Post Wraps" },
                { key: "pergolaCuts", label: "Pergola Cuts" },
                { key: "oneStepCornice", label: "1-Step Cornice" },
                { key: "twoStepCornice", label: "2-Step Cornice" },
                { key: "traxRise", label: "TRAX Rise" },
                { key: "ledStripGutter", label: "LED Strip Light (Gutter)" },
                { key: "ledStripTrax", label: "LED Strip Lights (TRAX)" },
              ] as const
            ).map(({ key, label }) => (
              <YNToggle
                key={key}
                label={label}
                value={formData.decorative[key] ? true : formData.decorative[key] === false ? false : null}
                onChange={(v) =>
                  updateFormData((p) => ({ ...p, decorative: { ...p.decorative, [key]: v } }))
                }
              />
            ))}
            <Field
              label="Other Decorative Features"
              value={formData.decorative.other}
              onChangeText={(v) => updateFormData((p) => ({ ...p, decorative: { ...p.decorative, other: v } }))}
              placeholder="Describe any other decorative features..."
              multiline
            />
          </ScrollView>
        );

      case "pergola":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <SectionHeader title="Pergola Review" />
            <CheckboxRow
              label="Location of Pergola reviewed"
              checked={formData.pergola.locationReviewed}
              onToggle={() => updateFormData((p) => ({ ...p, pergola: { ...p.pergola, locationReviewed: !p.pergola.locationReviewed } }))}
            />
            <Field
              label="Height of Pergola"
              value={formData.pergola.height}
              onChangeText={(v) => updateFormData((p) => ({ ...p, pergola: { ...p.pergola, height: v } }))}
              placeholder="e.g. 9 ft 6 in"
            />
            <Field
              label="Slope of Pergola"
              value={formData.pergola.slope}
              onChangeText={(v) => updateFormData((p) => ({ ...p, pergola: { ...p.pergola, slope: v } }))}
              placeholder="e.g. 1/4 inch per foot"
            />
            <Field
              label="Elevation drain lines will exit posts"
              value={formData.pergola.drainElevation}
              onChangeText={(v) => updateFormData((p) => ({ ...p, pergola: { ...p.pergola, drainElevation: v } }))}
              placeholder="e.g. 6 inches from ground"
            />
            <CheckboxRow
              label="Labeled the Posts that the Wiring will Enter Pergola (If Applicable)"
              checked={formData.pergola.wiringPostsLabeled}
              onToggle={() => updateFormData((p) => ({ ...p, pergola: { ...p.pergola, wiringPostsLabeled: !p.pergola.wiringPostsLabeled } }))}
            />
            <CheckboxRow
              label="Wire Diagram reviewed"
              checked={formData.pergola.wireDiagramReviewed}
              onToggle={() => updateFormData((p) => ({ ...p, pergola: { ...p.pergola, wireDiagramReviewed: !p.pergola.wireDiagramReviewed } }))}
            />
            <Field
              label="Amount (in Feet) of Wire to be left at bottom of designated posts"
              value={formData.pergola.wireFeetPerPost}
              onChangeText={(v) => updateFormData((p) => ({ ...p, pergola: { ...p.pergola, wireFeetPerPost: v } }))}
              placeholder="e.g. 3 feet"
            />
          </ScrollView>
        );

      case "expectations":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <SectionHeader title="Client Expectations Reviewed" />
            <CheckboxRow
              label="Approximate Time of Construction reviewed"
              checked={formData.expectations.constructionTimeReviewed}
              onToggle={() => updateFormData((p) => ({ ...p, expectations: { ...p.expectations, constructionTimeReviewed: !p.expectations.constructionTimeReviewed } }))}
            />
            <CheckboxRow
              label="Aluminum shavings will be cleaned — minor pieces may remain"
              checked={formData.expectations.aluminumShavingsReviewed}
              onToggle={() => updateFormData((p) => ({ ...p, expectations: { ...p.expectations, aluminumShavingsReviewed: !p.expectations.aluminumShavingsReviewed } }))}
            />
            <CheckboxRow
              label="Minor leaks may occur after installation — will be addressed promptly"
              checked={formData.expectations.minorLeaksReviewed}
              onToggle={() => updateFormData((p) => ({ ...p, expectations: { ...p.expectations, minorLeaksReviewed: !p.expectations.minorLeaksReviewed } }))}
            />
            <CheckboxRow
              label="Reviewed any changes or alterations to the original contract"
              checked={formData.expectations.contractChangesReviewed}
              onToggle={() => updateFormData((p) => ({ ...p, expectations: { ...p.expectations, contractChangesReviewed: !p.expectations.contractChangesReviewed } }))}
            />
            <CheckboxRow
              label="Identified any addendums needed for additional work outside contract scope"
              checked={formData.expectations.addendumsIdentified}
              onToggle={() => updateFormData((p) => ({ ...p, expectations: { ...p.expectations, addendumsIdentified: !p.expectations.addendumsIdentified } }))}
            />
          </ScrollView>
        );

      case "photos":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <SectionHeader title="Photos Were Taken Of" />
            <Text style={[styles.hint, { color: colors.muted }]}>Check each area where photos were taken prior to installation.</Text>
            {(
              [
                { key: "driveway", label: "Driveway & Access Conditions" },
                { key: "stagingArea", label: "Location of Staging Area" },
                { key: "pergolLocation", label: "Location of Pergola" },
                { key: "workArea", label: "Location of Work Area" },
                { key: "postLocations", label: "Location of the Posts to be Installed" },
                { key: "priorDamage", label: "Any and all Photos of any Damage to the Property or Dwelling Prior to Starting Work" },
                { key: "installationProhibitions", label: "Any Circumstance that will Prohibit the Installation of the Pergola" },
              ] as const
            ).map(({ key, label }) => (
              <CheckboxRow
                key={key}
                label={label}
                checked={formData.photos[key]}
                onToggle={() => updateFormData((p) => ({ ...p, photos: { ...p.photos, [key]: !p.photos[key] } }))}
              />
            ))}
          </ScrollView>
        );

      case "materials":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <SectionHeader title="List of Items Needed for This Project" />
            {(
              [
                { key: "ledgerBoard", label: '5/4" x 12" Ledger Board (or similar)' },
                { key: "jChannel", label: '"J" Channel' },
                { key: "flashing", label: "Flashing" },
                { key: "deckBlocking", label: "Deck Blocking" },
              ] as const
            ).map(({ key, label }) => (
              <YNToggle
                key={key}
                label={label}
                value={formData.materials[key] === true ? true : formData.materials[key] === false ? false : null}
                onChange={(v) => updateFormData((p) => ({ ...p, materials: { ...p.materials, [key]: v } }))}
              />
            ))}
            <View style={styles.downspoutRow}>
              <View style={{ flex: 1 }}>
                <YNToggle
                  label='3" Downspout Pipe'
                  value={formData.materials.downspoutPipe === true ? true : formData.materials.downspoutPipe === false ? false : null}
                  onChange={(v) => updateFormData((p) => ({ ...p, materials: { ...p.materials, downspoutPipe: v } }))}
                />
              </View>
              <TextInput
                style={[styles.qtyInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={formData.materials.downspoutQty}
                onChangeText={(v) => updateFormData((p) => ({ ...p, materials: { ...p.materials, downspoutQty: v } }))}
                placeholder="Qty"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>

            <SectionHeader title="Wire" />
            {(
              [
                { key: "wire14_2", label: "14/2" },
                { key: "wire12_2", label: "12/2" },
                { key: "wireMotor", label: "Motor" },
                { key: "wire10_3", label: "10/3" },
              ] as const
            ).map(({ key, label }) => (
              <View key={key} style={styles.wireRow}>
                <View style={{ flex: 1 }}>
                  <YNToggle
                    label={label}
                    value={formData.materials[key].checked === true ? true : formData.materials[key].checked === false ? false : null}
                    onChange={(v) =>
                      updateFormData((p) => ({
                        ...p,
                        materials: { ...p.materials, [key]: { ...p.materials[key], checked: v } },
                      }))
                    }
                  />
                </View>
                <TextInput
                  style={[styles.qtyInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={formData.materials[key].qty}
                  onChangeText={(v) =>
                    updateFormData((p) => ({
                      ...p,
                      materials: { ...p.materials, [key]: { ...p.materials[key], qty: v } },
                    }))
                  }
                  placeholder="Qty"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              </View>
            ))}
            <Field
              label="Other Items"
              value={formData.materials.otherItems}
              onChangeText={(v) => updateFormData((p) => ({ ...p, materials: { ...p.materials, otherItems: v } }))}
              placeholder="List any other required materials..."
              multiline
            />
          </ScrollView>
        );

      case "work":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <SectionHeader title="Additional Work Items" />
            {(
              [
                { key: "electrical", label: "Electrical Work" },
                { key: "footings", label: "Footings" },
                { key: "patioAlterations", label: "Patio Alterations" },
                { key: "deckAlterations", label: "Deck Alterations" },
                { key: "houseGutterAlterations", label: "House Gutter Alterations" },
              ] as const
            ).map(({ key, label }) => (
              <WorkItemBlock
                key={key}
                title={label}
                item={formData.workItems[key]}
                onChange={(updates) =>
                  updateFormData((p) => ({
                    ...p,
                    workItems: {
                      ...p.workItems,
                      [key]: { ...p.workItems[key], ...updates },
                    },
                  }))
                }
              />
            ))}
          </ScrollView>
        );

      case "notes":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <SectionHeader title="Project Notes" />
            <Field
              label="StruXure Project Notes"
              value={formData.projectNotes}
              onChangeText={(v) => updateFormData((p) => ({ ...p, projectNotes: v }))}
              placeholder="Enter any project-specific notes..."
              multiline
            />
            <SectionHeader title="Client Remarks / Requests" />
            <Field
              label="Client Remarks"
              value={formData.clientRemarks}
              onChangeText={(v) => updateFormData((p) => ({ ...p, clientRemarks: v }))}
              placeholder="Enter client remarks or special requests..."
              multiline
            />
          </ScrollView>
        );

      case "signatures":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <SectionHeader title="Signatures" />
            <View style={[styles.sigNote, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
              <Text style={[styles.sigNoteText, { color: colors.foreground }]}>
                By signing below, the client confirms understanding of all items discussed in this Pre-Construction Checklist and agrees to the points covered, helping ensure a successful and smooth pre-construction process.
              </Text>
            </View>

            <SignatureBlock
              title="Project Supervisor Signature"
              signedName={checklist?.supervisorSignedName ?? ""}
              signedAt={checklist?.supervisorSignedAt}
              onSign={async (name) => {
                await updateMutation.mutateAsync({ id: checklistId, supervisorSignedName: name, supervisorSignature: "signed" });
                refetch();
              }}
            />
            <SignatureBlock
              title="Client / Authorized Signature"
              signedName={checklist?.client1SignedName ?? ""}
              signedAt={checklist?.client1SignedAt}
              onSign={async (name) => {
                await updateMutation.mutateAsync({ id: checklistId, client1SignedName: name, client1Signature: "signed", status: "signed" });
                refetch();
              }}
            />
            <SignatureBlock
              title="Client / Authorized Signature (2nd)"
              signedName={checklist?.client2SignedName ?? ""}
              signedAt={checklist?.client2SignedAt}
              onSign={async (name) => {
                await updateMutation.mutateAsync({ id: checklistId, client2SignedName: name, client2Signature: "signed" });
                refetch();
              }}
              optional
            />
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {projectName || "Preconstruction Checklist"}
        </Text>
        <View style={styles.headerRight}>
          {saving && <ActivityIndicator size="small" color={colors.muted} style={{ marginRight: 8 }} />}
          <TouchableOpacity
            style={[styles.pdfBtn, { borderColor: colors.primary }]}
            onPress={handleGeneratePdf}
            disabled={pdfLoading}
            activeOpacity={0.8}
          >
            {pdfLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.pdfBtnText, { color: colors.primary }]}>PDF</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Action bar: Mark Complete + Go to Dashboard */}
      <View style={[styles.actionBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {status === "draft" && (
          <TouchableOpacity
            style={[styles.actionBarBtn, { backgroundColor: colors.primary }]}
            onPress={handleMarkComplete}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBarBtnText}>✓ Mark Complete</Text>
          </TouchableOpacity>
        )}
        {status === "completed" && (
          <View style={[styles.actionBarStatus, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.actionBarStatusText, { color: colors.primary }]}>✓ Completed</Text>
          </View>
        )}
        {status === "signed" && (
          <View style={[styles.actionBarStatus, { backgroundColor: colors.success + "15" }]}>
            <Text style={[styles.actionBarStatusText, { color: colors.success }]}>✓ Signed</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.actionBarBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
          onPress={() => router.push({ pathname: "/(tabs)/modules/dashboard", params: { module: "precon" } })}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionBarBtnText, { color: colors.foreground }]}>Dashboard →</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? colors.primary : colors.muted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <View style={{ flex: 1 }}>{renderTabContent()}</View>
    </ScreenContainer>
  );
}

// ─── Signature Block ──────────────────────────────────────────────────────────
function SignatureBlock({
  title,
  signedName,
  signedAt,
  onSign,
  optional,
}: {
  title: string;
  signedName: string;
  signedAt?: string | null;
  onSign: (name: string) => Promise<void>;
  optional?: boolean;
}) {
  const colors = useColors();
  const [nameInput, setNameInput] = useState("");
  const [signing, setSigning] = useState(false);
  const isSigned = !!signedName;

  const handleSign = async () => {
    if (!nameInput.trim()) {
      Alert.alert("Name Required", "Please enter the full name before signing.");
      return;
    }
    setSigning(true);
    try {
      await onSign(nameInput.trim());
      setNameInput("");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSigning(false);
    }
  };

  return (
    <View style={[styles.sigBlock, { borderColor: colors.border }]}>
      <Text style={[styles.sigTitle, { color: colors.foreground }]}>
        {title}
        {optional && <Text style={{ color: colors.muted }}> (Optional)</Text>}
      </Text>
      {isSigned ? (
        <View style={[styles.sigSigned, { backgroundColor: colors.success + "15" }]}>
          <Text style={[styles.sigSignedName, { color: colors.success }]}>✓ Signed: {signedName}</Text>
          {signedAt && (
            <Text style={[styles.sigSignedDate, { color: colors.muted }]}>
              {new Date(signedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.sigInputRow}>
          <TextInput
            style={[styles.sigInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface, flex: 1 }]}
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="Print Name"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.signBtn, { backgroundColor: colors.primary, opacity: signing ? 0.7 : 1 }]}
            onPress={handleSign}
            disabled={signing}
            activeOpacity={0.8}
          >
            {signing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.signBtnText}>Sign</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  backBtn: { paddingVertical: 4, paddingRight: 4 },
  backText: { fontSize: 14, fontWeight: "600" },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: "700", textAlign: "center" },
  headerRight: { flexDirection: "row", alignItems: "center" },
  pdfBtn: { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  pdfBtnText: { fontSize: 12, fontWeight: "700" },
  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth, maxHeight: 44 },
  tabBarContent: { paddingHorizontal: 8 },
  tabItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabLabel: { fontSize: 13, fontWeight: "600" },
  tabContent: { paddingBottom: 40 },
  hint: { fontSize: 12, paddingHorizontal: 16, paddingVertical: 6, lineHeight: 18 },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 14, fontWeight: "600" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  completeBtn: { margin: 16, paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  completeBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  downspoutRow: { flexDirection: "row", alignItems: "center", paddingRight: 16 },
  wireRow: { flexDirection: "row", alignItems: "center", paddingRight: 16 },
  qtyInput: { width: 60, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, textAlign: "center" },
  sigNote: { margin: 16, borderWidth: 1, borderRadius: 10, padding: 14 },
  sigNoteText: { fontSize: 13, lineHeight: 20 },
  sigBlock: { margin: 12, borderWidth: 1, borderRadius: 10, padding: 14, gap: 10 },
  sigTitle: { fontSize: 14, fontWeight: "700" },
  sigSigned: { borderRadius: 8, padding: 12, gap: 4 },
  sigSignedName: { fontSize: 15, fontWeight: "700" },
  sigSignedDate: { fontSize: 12 },
  sigInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  sigInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, minHeight: 40 },
  signBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, minWidth: 60, alignItems: "center" },
  signBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  actionBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, flexWrap: "wrap" },
  actionBarBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  actionBarBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  actionBarStatus: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  actionBarStatusText: { fontSize: 13, fontWeight: "700" },
});
