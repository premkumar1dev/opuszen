import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  Show,
  SimpleShowLayout,
  TextInput,
  SelectInput,
} from "react-admin";
import { Chip } from "@mui/material";

// Custom status renderer component
const StatusChipField = ({ source }: { source: string }) => {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: "bold",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        color: "rgb(52, 211, 153)",
        border: "1px solid rgba(16, 185, 129, 0.2)",
      }}
    >
      200 OK
    </span>
  );
};

export const LogList = () => (
  <List
    filters={[
      <TextInput key="model" label="Search Model" source="model" alwaysOn />,
      <SelectInput
        key="status"
        label="Response Code"
        source="status"
        choices={[
          { id: 200, name: "200 OK" },
          { id: 429, name: "429 Rate Limited" },
          { id: 500, name: "500 Gateway Error" },
        ]}
      />,
    ]}
    exporter={false}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <DateField source="time" label="Time" showTime />
      <TextField source="keyPrefix" label="API Key Used" />
      <TextField source="model" label="Model Route" />
      <NumberField source="latencyMs" label="Latency (ms)" />
      <NumberField source="status" label="HTTP Status" />
      <NumberField source="promptTokens" label="Input Tokens" />
      <NumberField source="completionTokens" label="Output Tokens" />
    </Datagrid>
  </List>
);

export const LogShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <DateField source="time" label="Request Timestamp" showTime />
      <TextField source="keyId" label="Key ID" />
      <TextField source="keyPrefix" label="Key Prefix" />
      <TextField source="model" label="Target AI Model" />
      <NumberField source="status" label="HTTP Status Code" />
      <NumberField source="latencyMs" label="Processing Latency (ms)" />
      <NumberField source="promptTokens" label="Prompt Tokens Count" />
      <NumberField source="completionTokens" label="Completion Tokens Count" />
    </SimpleShowLayout>
  </Show>
);
