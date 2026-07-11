import {
  List,
  Datagrid,
  TextField,
  BooleanField,
  NumberField,
  DateField,
  Show,
  SimpleShowLayout,
  Create,
  Edit,
  SimpleForm,
  TextInput,
  BooleanInput,
  NumberInput,
  SelectInput,
  DateInput,
  EditButton,
  ShowButton,
  TopToolbar,
  CreateButton,
  ExportButton,
  FilterLiveSearch,
} from "react-admin";
import { Chip } from "@mui/material";

// Custom Actions component for key list
const KeyListActions = () => (
  <TopToolbar>
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

export const ApiKeyList = () => (
  <List actions={<KeyListActions />} filters={[
    <TextInput key="name" label="Search Key Name" source="name" alwaysOn />,
    <SelectInput key="plan" label="Filter Plan" source="planName" choices={[
      { id: "Starter Plan (1x)", name: "Starter Plan" },
      { id: "Pro Plan (5x)", name: "Pro Plan" },
      { id: "Enterprise Plan (20x)", name: "Enterprise Plan" },
    ]} />,
  ]}>
    <Datagrid rowClick="show">
      <TextField source="name" label="Key Name" />
      <TextField source="keyPrefix" label="Prefix" />
      <TextField source="planName" label="Plan Rate" />
      <BooleanField source="isActive" label="Active" />
      <NumberField source="rateLimit" label="Rate Limit (req/m)" />
      <NumberField source="totalRequests" label="All Reqs" />
      <DateField source="expiresAt" label="Expiry Date" />
      <EditButton />
    </Datagrid>
  </List>
);

export const ApiKeyShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="name" label="Key Description Name" />
      <TextField source="keyPrefix" label="Security Prefix Token" />
      <TextField source="planName" label="Tier Plan" />
      <BooleanField source="isActive" label="Active Authorization Status" />
      <BooleanField source="unlimited" label="Bypass Monthly Budgets" />
      <NumberField source="rateLimit" label="Rate Limit Per Minute" />
      <NumberField source="totalRequests" label="Cumulative API Requests" />
      <NumberField source="windowTokensLimit" label="Token Limit Capacity" />
      <NumberField source="windowTokensUsed" label="Consumed Tokens" />
      <DateField source="createdAt" label="Creation Timestamp" showTime />
      <DateField source="expiresAt" label="Expiry Timestamp" showTime />
      <DateField source="lastUsedAt" label="Last Traffic Observed" showTime />
    </SimpleShowLayout>
  </Show>
);

export const ApiKeyCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name" label="Key Name / Identifier" fullWidth required />
      <SelectInput
        source="planName"
        label="Plan / Limit Multiplier"
        required
        choices={[
          { id: "Starter Plan (1x)", name: "Starter Plan (1x)" },
          { id: "Pro Plan (5x)", name: "Pro Plan (5x)" },
          { id: "Enterprise Plan (20x)", name: "Enterprise Plan (20x)" },
        ]}
        defaultValue="Pro Plan (5x)"
      />
      <NumberInput source="rateLimit" label="Rate Limit (req/min)" defaultValue={60} min={1} required />
      <NumberInput source="windowTokensLimit" label="Monthly Token Budget" defaultValue={5000000} min={1} required />
      <DateInput source="expiresAt" label="Key Expiry Date" required />
      <BooleanInput source="unlimited" label="Unlimited Billing Mode" defaultValue={false} />
    </SimpleForm>
  </Create>
);

export const ApiKeyEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="name" label="Key Name / Identifier" fullWidth required />
      <SelectInput
        source="planName"
        label="Plan / Limit Multiplier"
        required
        choices={[
          { id: "Starter Plan (1x)", name: "Starter Plan (1x)" },
          { id: "Pro Plan (5x)", name: "Pro Plan (5x)" },
          { id: "Enterprise Plan (20x)", name: "Enterprise Plan (20x)" },
        ]}
      />
      <NumberInput source="rateLimit" label="Rate Limit (req/min)" required />
      <NumberInput source="windowTokensLimit" label="Monthly Token Budget" required />
      <DateInput source="expiresAt" label="Key Expiry Date" required />
      <BooleanInput source="isActive" label="Active Authorization Status" />
      <BooleanInput source="unlimited" label="Unlimited Billing Mode" />
    </SimpleForm>
  </Edit>
);
