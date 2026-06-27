import axios from "axios";

const API_BASE = "http://localhost:2500/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
  };
};

const getRecordLabel = (record) => {
  const data = record?.data || {};
  return (
    data.name ||
    data.shopName ||
    data.title ||
    data.label ||
    data.code ||
    data.billNumber ||
    record?.name ||
    record?.email ||
    record?._id
  );
};

export const fetchModuleDefinition = async (moduleKey) => {
  const response = await axios.get(`${API_BASE}/modules/definition/${moduleKey}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const fetchModuleDefinitions = async () => {
  const response = await axios.get(`${API_BASE}/modules/definitions`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const fetchRecords = async (moduleKey) => {
  const response = await axios.get(`${API_BASE}/records/${moduleKey}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const createRecord = async (moduleKey, data) => {
  const response = await axios.post(
    `${API_BASE}/records/${moduleKey}`,
    { data },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const updateRecord = async (moduleKey, id, data) => {
  const response = await axios.put(
    `${API_BASE}/records/${moduleKey}/${id}`,
    { data },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const deleteRecord = async (moduleKey, id) => {
  const response = await axios.delete(`${API_BASE}/records/${moduleKey}/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const hydrateModuleDefinition = async (moduleKey) => {
  const definition = await fetchModuleDefinition(moduleKey);
  const fields = await Promise.all(
    (definition.fields || []).map(async (field) => {
      if (field.type === "relation" && field.ref) {
        if (field.ref === "user" || field.ref === "users") {
          const usersResponse = await axios.get(`${API_BASE}/users`, {
            headers: getAuthHeaders(),
          });
          const users = usersResponse.data || [];
          return {
            ...field,
            options: users.map((user) => ({
              label: user.name || user.email || user._id,
              value: user._id,
            })),
          };
        }

        const related = await fetchRecords(field.ref);
        return {
          ...field,
          options: (related || []).map((record) => ({
            label: getRecordLabel(record),
            value: record._id,
          })),
        };
      }

      return field;
    })
  );

  return { ...definition, fields };
};
