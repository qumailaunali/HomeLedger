"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import { generalSettingsSchema, type GeneralSettingsInput } from "@/lib/validation";
import { DATE_FORMATS, formatDate } from "@/lib/dates";
import { updateGeneralSettings } from "@/server/actions/settings";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";
import { Segmented } from "@/components/ui/misc";

const CURRENCIES = [
  { code: "PKR", symbol: "Rs." },
  { code: "AED", symbol: "AED" },
  { code: "SAR", symbol: "SAR" },
  { code: "USD", symbol: "$" },
  { code: "GBP", symbol: "£" },
  { code: "EUR", symbol: "€" },
  { code: "INR", symbol: "₹" },
];

const TIMEZONES = ["Asia/Karachi", "Asia/Dubai", "Asia/Riyadh", "Asia/Kolkata", "Europe/London", "America/New_York", "UTC"];

export function GeneralForm({ defaults }: { defaults: GeneralSettingsInput }) {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser.
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const form = useForm<GeneralSettingsInput>({ resolver: zodResolver(generalSettingsSchema), defaultValues: defaults });
  const { register, handleSubmit, setValue, formState } = form;
  const e = formState.errors;
  const tzOptions = TIMEZONES.includes(defaults.timezone) ? TIMEZONES : [defaults.timezone, ...TIMEZONES];

  return (
    <>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>General</CardTitle>
            <CardDescription>Household name, currency and how dates are shown.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            className="grid gap-4"
            onSubmit={handleSubmit(async (values) => {
              const res = await updateGeneralSettings(values).catch(() => null);
              if (res?.ok) toast.success("Settings saved");
              else toast.error(res && !res.ok ? res.error : "Could not save settings. Please try again.");
            })}
          >
            <Field label="Household / app name" htmlFor="name" error={e.name?.message}>
              <Input id="name" {...register("name")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default currency" htmlFor="currency" error={e.currency?.message}>
                <NativeSelect
                  id="currency"
                  {...register("currency", {
                    onChange: (ev) => {
                      const c = CURRENCIES.find((x) => x.code === ev.target.value);
                      if (c) setValue("currencySymbol", c.symbol);
                    },
                  })}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                  {!CURRENCIES.some((c) => c.code === defaults.currency) && <option value={defaults.currency}>{defaults.currency}</option>}
                </NativeSelect>
              </Field>
              <Field label="Currency symbol" htmlFor="currencySymbol" error={e.currencySymbol?.message} hint="Shown before amounts, e.g. Rs. 1,400">
                <Input id="currencySymbol" {...register("currencySymbol")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date format" htmlFor="dateFormat">
                <NativeSelect id="dateFormat" {...register("dateFormat")}>
                  {DATE_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {formatDate("2026-10-05", f)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Timezone" htmlFor="timezone" error={e.timezone?.message} hint="Decides what “today” and “this month” mean.">
                <NativeSelect id="timezone" {...register("timezone")}>
                  {tzOptions.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field
              label="Starting balance"
              htmlFor="startingBalance"
              error={e.startingBalance?.message}
              hint="The cash you had before your first record. Balance = starting balance + money received − expenses."
              className="sm:max-w-xs"
            >
              <Input id="startingBalance" inputMode="decimal" {...register("startingBalance")} />
            </Field>
            <div>
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting && <Loader2 className="animate-spin" />}
                Save settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Remembered on this device.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Segmented
            label="Theme"
            value={mounted ? (theme ?? "system") : "system"}
            onChange={setTheme}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "system", label: "System" },
            ]}
            className="w-full max-w-xs"
          />
        </CardContent>
      </Card>
    </>
  );
}
