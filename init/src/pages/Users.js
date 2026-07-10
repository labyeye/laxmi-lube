import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import styled from "styled-components";
import { fmtDate } from "../utils/dateFormat";
import {
  FaUserPlus,
  FaUserEdit,
  FaTrash,
  FaUsers,
  FaShieldAlt,
  FaSearch,
  FaFilter,
  FaDownload,
  FaTh,
  FaList,
  FaUserCheck,
  FaUserTimes,
  FaEye,
  FaEyeSlash,
  FaChartBar,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaCog,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaSync,
} from "react-icons/fa";
import Layout from "../components/Layout";
import PermissionManager from "../components/PermissionManager";

const ROLES = ["all", "admin", "staff"];
const STATUS_OPTIONS = ["all", "active", "inactive"];

const Users = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] =
    useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    email: true,
    role: true,
    createdAt: true,
    lastLogin: false,
    actions: true,
  });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "http://localhost:1200/api/users",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setUsers(response.data);
    } catch (err) {
      setError("Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === "admin").length,
      staff: users.filter((u) => u.role === "staff").length,
      active: users.filter((u) => u.status !== "inactive").length,
    }),
    [users],
  );

  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q),
      );
    }
    if (filterRole !== "all") list = list.filter((u) => u.role === filterRole);
    if (filterStatus !== "all")
      list = list.filter((u) =>
        filterStatus === "active"
          ? u.status !== "inactive"
          : u.status === "inactive",
      );
    list.sort((a, b) => {
      const av = (a[sortField] || "").toString().toLowerCase();
      const bv = (b[sortField] || "").toString().toLowerCase();
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [users, searchTerm, filterRole, filterStatus, sortField, sortDir]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <FaSort style={{ opacity: 0.3 }} />;
    return sortDir === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`http://localhost:1200/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setMessage("User deleted successfully");
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch {
      setError("Error deleting user");
    }
    setTimeout(() => {
      setMessage("");
      setError("");
    }, 3000);
  };

  const handleBulkDelete = async () => {
    if (!selectedUsers.length) return;
    if (!window.confirm(`Delete ${selectedUsers.length} selected user(s)?`))
      return;
    try {
      await Promise.all(
        selectedUsers.map((id) =>
          axios.delete(`http://localhost:1200/api/users/${id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }),
        ),
      );
      setUsers((prev) => prev.filter((u) => !selectedUsers.includes(u._id)));
      setSelectedUsers([]);
      setMessage(`${selectedUsers.length} users deleted`);
    } catch {
      setError("Error deleting users");
    }
    setTimeout(() => {
      setMessage("");
      setError("");
    }, 3000);
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === "inactive" ? "active" : "inactive";
    try {
      await axios.put(
        `http://localhost:1200/api/users/${user._id}`,
        { ...user, status: newStatus },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, status: newStatus } : u)),
      );
      setMessage(
        `User ${newStatus === "active" ? "activated" : "deactivated"}`,
      );
    } catch {
      setError("Could not update status");
    }
    setTimeout(() => {
      setMessage("");
      setError("");
    }, 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editMode) {
        const payload = { ...newUser };
        if (!payload.password) delete payload.password;
        await axios.put(
          `http://localhost:1200/api/users/${currentUserId}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        setMessage("User updated successfully");
      } else {
        await axios.post("http://localhost:1200/api/users", newUser, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setMessage("User added successfully");
      }
      await fetchUsers();
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Error processing user");
    } finally {
      setLoading(false);
      setTimeout(() => {
        setMessage("");
        setError("");
      }, 3000);
    }
  };

  const handleEdit = (user) => {
    setNewUser({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setEditMode(true);
    setCurrentUserId(user._id);
    setShowForm(true);
  };

  const resetForm = () => {
    setNewUser({ name: "", email: "", password: "", role: "staff" });
    setEditMode(false);
    setCurrentUserId(null);
    setShowPassword(false);
  };

  const handleManagePermissions = (user) => {
    setSelectedUserForPermissions(user);
    setShowPermissions(true);
  };

  const handleUpdatePermissions = async (userId, permissions) => {
    try {
      await axios.patch(
        `http://localhost:1200/api/users/${userId}/permissions`,
        { permissions },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      await fetchUsers();
      setMessage("Permissions updated successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      throw new Error("Failed to update permissions");
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Role", "Status"];
    const rows = filteredUsers.map((u) => [
      u.name,
      u.email,
      u.role,
      u.status || "active",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelectUser = (id) =>
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleSelectAll = () =>
    setSelectedUsers(
      selectedUsers.length === paginatedUsers.length
        ? []
        : paginatedUsers.map((u) => u._id),
    );

  const UserAvatar = ({ name, role }) => {
    const initials = (name || "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return <AvatarCircle role={role}>{initials}</AvatarCircle>;
  };

  const CardAvatar = ({ name, role }) => {
    const initials = (name || "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return <BigAvatar role={role}>{initials}</BigAvatar>;
  };

  return (
    <Layout>
      <PageWrapper>
        <PageHeaderBar>
          <PageTitleGroup>
            <FaUsers size={22} />
            <h1>User Management</h1>
          </PageTitleGroup>
          <TabRow>
            <TabBtn
              active={activeTab === "list"}
              onClick={() => setActiveTab("list")}
            >
              <FaList /> Users
            </TabBtn>
            <TabBtn
              active={activeTab === "settings"}
              onClick={() => setActiveTab("settings")}
            >
              <FaCog /> Settings
            </TabBtn>
          </TabRow>
          <HeaderActions>
            <RefreshBtn onClick={fetchUsers} title="Refresh">
              <FaSync />
            </RefreshBtn>
            <ExportBtn onClick={exportCSV}>
              <FaDownload /> Export CSV
            </ExportBtn>
            <AddBtn
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <FaUserPlus /> Add User
            </AddBtn>
          </HeaderActions>
        </PageHeaderBar>

        {error && <Alert type="error">{error}</Alert>}
        {message && <Alert type="success">{message}</Alert>}

        {activeTab === "list" && (
          <>
            <StatsGrid>
              <StatCard accent="var(--nb-blue)">
                <div className="val">{stats.total}</div>
                <div className="lbl">Total Users</div>
              </StatCard>
              <StatCard accent="var(--nb-blue-medium)">
                <div className="val">{stats.admins}</div>
                <div className="lbl">Admins</div>
              </StatCard>
              <StatCard accent="var(--nb-blue)">
                <div className="val">{stats.staff}</div>
                <div className="lbl">Staff</div>
              </StatCard>
              <StatCard accent="var(--nb-border)">
                <div className="val">{stats.active}</div>
                <div className="lbl">Active</div>
              </StatCard>
            </StatsGrid>

            <Toolbar>
              <SearchBox>
                <FaSearch />
                <input
                  placeholder="Search by name or email"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </SearchBox>
              <FilterGroup>
                <FilterLabel>
                  <FaFilter /> Role:
                </FilterLabel>
                <FilterSelect
                  value={filterRole}
                  onChange={(e) => {
                    setFilterRole(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r === "all"
                        ? "All Roles"
                        : r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </FilterSelect>
              </FilterGroup>
              <FilterGroup>
                <FilterLabel>Status:</FilterLabel>
                <FilterSelect
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s === "all"
                        ? "All Status"
                        : s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </FilterSelect>
              </FilterGroup>
              <ViewToggle>
                <ViewBtn
                  active={viewMode === "table"}
                  onClick={() => setViewMode("table")}
                >
                  <FaList />
                </ViewBtn>
                <ViewBtn
                  active={viewMode === "cards"}
                  onClick={() => setViewMode("cards")}
                >
                  <FaTh />
                </ViewBtn>
              </ViewToggle>
            </Toolbar>

            {selectedUsers.length > 0 && (
              <BulkBar>
                <span>{selectedUsers.length} selected</span>
                <BulkBtn danger onClick={handleBulkDelete}>
                  <FaTrash /> Delete Selected
                </BulkBtn>
                <BulkBtn onClick={() => setSelectedUsers([])}>Clear</BulkBtn>
              </BulkBar>
            )}

            <ResultsInfo>
              Showing{" "}
              {Math.min((currentPage - 1) * pageSize + 1, filteredUsers.length)}
              –{Math.min(currentPage * pageSize, filteredUsers.length)} of{" "}
              {filteredUsers.length} users
            </ResultsInfo>

            {loading ? (
              <LoadingState>
                <div className="spinner" />
                <p>Loading users</p>
              </LoadingState>
            ) : filteredUsers.length === 0 ? (
              <EmptyState>
                <FaUsers size={40} />
                <p>No users found</p>
              </EmptyState>
            ) : viewMode === "table" ? (
              <TableWrapper>
                <DataTable>
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={
                            selectedUsers.length === paginatedUsers.length &&
                            paginatedUsers.length > 0
                          }
                          onChange={toggleSelectAll}
                        />
                      </th>
                      {visibleColumns.name && (
                        <th
                          onClick={() => handleSort("name")}
                          style={{ cursor: "pointer" }}
                        >
                          Name <SortIcon field="name" />
                        </th>
                      )}
                      {visibleColumns.email && (
                        <th
                          onClick={() => handleSort("email")}
                          style={{ cursor: "pointer" }}
                        >
                          Email <SortIcon field="email" />
                        </th>
                      )}
                      {visibleColumns.role && (
                        <th
                          onClick={() => handleSort("role")}
                          style={{ cursor: "pointer" }}
                        >
                          Role <SortIcon field="role" />
                        </th>
                      )}
                      {visibleColumns.createdAt && <th>Joined</th>}
                      {visibleColumns.lastLogin && <th>Last Login</th>}
                      {visibleColumns.actions && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user, idx) => (
                      <tr key={user._id} className={idx % 2 === 1 ? "alt" : ""}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user._id)}
                            onChange={() => toggleSelectUser(user._id)}
                          />
                        </td>
                        {visibleColumns.name && (
                          <td>
                            <UserCell>
                              <UserAvatar name={user.name} role={user.role} />
                              <UserInfo>
                                <span className="uname">{user.name}</span>
                                <StatusDot
                                  active={user.status !== "inactive"}
                                />
                              </UserInfo>
                            </UserCell>
                          </td>
                        )}
                        {visibleColumns.email && (
                          <td>
                            <small>{user.email}</small>
                          </td>
                        )}
                        {visibleColumns.role && (
                          <td>
                            <RoleBadge role={user.role}>{user.role}</RoleBadge>
                          </td>
                        )}
                        {visibleColumns.createdAt && (
                          <td>
                            <small>
                              {user.createdAt ? fmtDate(user.createdAt) : "—"}
                            </small>
                          </td>
                        )}
                        {visibleColumns.lastLogin && (
                          <td>
                            <small>
                              {user.lastLogin
                                ? fmtDate(user.lastLogin)
                                : "Never"}
                            </small>
                          </td>
                        )}
                        {visibleColumns.actions && (
                          <td>
                            <ActionBtns>
                              <IconBtn
                                title="Edit"
                                onClick={() => handleEdit(user)}
                              >
                                <FaUserEdit />
                              </IconBtn>
                              <IconBtn
                                title="Manage Permissions"
                                accent
                                onClick={() => handleManagePermissions(user)}
                              >
                                <FaShieldAlt />
                              </IconBtn>
                              <IconBtn
                                title={
                                  user.status === "inactive"
                                    ? "Activate"
                                    : "Deactivate"
                                }
                                onClick={() => handleToggleStatus(user)}
                              >
                                {user.status === "inactive" ? (
                                  <FaUserCheck />
                                ) : (
                                  <FaUserTimes />
                                )}
                              </IconBtn>
                              <IconBtn
                                title="Delete"
                                danger
                                onClick={() => handleDelete(user._id)}
                              >
                                <FaTrash />
                              </IconBtn>
                            </ActionBtns>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </TableWrapper>
            ) : (
              <CardsGrid>
                {paginatedUsers.map((user) => (
                  <UserCard key={user._id}>
                    <CardCheck>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => toggleSelectUser(user._id)}
                      />
                    </CardCheck>
                    <CardAvatar name={user.name} role={user.role} />
                    <CardName>{user.name}</CardName>
                    <CardEmail>{user.email}</CardEmail>
                    <CardMeta>
                      <RoleBadge role={user.role}>{user.role}</RoleBadge>
                      <StatusPill active={user.status !== "inactive"}>
                        {user.status !== "inactive" ? (
                          <>
                            <FaCheckCircle /> Active
                          </>
                        ) : (
                          <>
                            <FaTimesCircle /> Inactive
                          </>
                        )}
                      </StatusPill>
                    </CardMeta>
                    {user.createdAt && (
                      <CardJoined>
                        <FaClock size={10} /> Joined {fmtDate(user.createdAt)}
                      </CardJoined>
                    )}
                    <CardActions>
                      <CardActionBtn onClick={() => handleEdit(user)}>
                        <FaUserEdit /> Edit
                      </CardActionBtn>
                      <CardActionBtn
                        accent
                        onClick={() => handleManagePermissions(user)}
                      >
                        <FaShieldAlt /> Permissions
                      </CardActionBtn>
                      <CardActionBtn onClick={() => handleToggleStatus(user)}>
                        {user.status === "inactive" ? (
                          <>
                            <FaUserCheck /> Activate
                          </>
                        ) : (
                          <>
                            <FaUserTimes /> Deactivate
                          </>
                        )}
                      </CardActionBtn>
                      <CardActionBtn
                        danger
                        onClick={() => handleDelete(user._id)}
                      >
                        <FaTrash /> Delete
                      </CardActionBtn>
                    </CardActions>
                  </UserCard>
                ))}
              </CardsGrid>
            )}

            {totalPages > 1 && (
              <Pagination>
                <PagBtn
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  {" "}
                  Prev
                </PagBtn>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <PagBtn
                      key={p}
                      active={p === currentPage}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </PagBtn>
                  ),
                )}
                <PagBtn
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next{" "}
                </PagBtn>
              </Pagination>
            )}
          </>
        )}

        {activeTab === "settings" && (
          <SettingsPanel>
            <SettingsSection>
              <SectionTitle>
                <FaChartBar /> Visible Columns
              </SectionTitle>
              <ColumnToggles>
                {Object.keys(visibleColumns).map((col) => (
                  <ToggleRow key={col}>
                    <ToggleLabel>
                      {col
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (s) => s.toUpperCase())}
                    </ToggleLabel>
                    <ToggleSwitch
                      active={visibleColumns[col]}
                      onClick={() =>
                        setVisibleColumns((prev) => ({
                          ...prev,
                          [col]: !prev[col],
                        }))
                      }
                    >
                      <span />
                    </ToggleSwitch>
                  </ToggleRow>
                ))}
              </ColumnToggles>
            </SettingsSection>
            <SettingsSection>
              <SectionTitle>
                <FaList /> Pagination
              </SectionTitle>
              <SettingRow>
                <SettingLabel>Users per page</SettingLabel>
                <SettingSelect
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  {[5, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </SettingSelect>
              </SettingRow>
            </SettingsSection>
            <SettingsSection>
              <SectionTitle>
                <FaTh /> Default View
              </SectionTitle>
              <SettingRow>
                <SettingLabel>Display mode</SettingLabel>
                <ViewToggle>
                  <ViewBtn
                    active={viewMode === "table"}
                    onClick={() => setViewMode("table")}
                  >
                    <FaList /> Table
                  </ViewBtn>
                  <ViewBtn
                    active={viewMode === "cards"}
                    onClick={() => setViewMode("cards")}
                  >
                    <FaTh /> Cards
                  </ViewBtn>
                </ViewToggle>
              </SettingRow>
            </SettingsSection>
            <SettingsSection>
              <SectionTitle>
                <FaFilter /> Default Filters
              </SectionTitle>
              <SettingRow>
                <SettingLabel>Default role</SettingLabel>
                <SettingSelect
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r === "all" ? "All Roles" : r}
                    </option>
                  ))}
                </SettingSelect>
              </SettingRow>
              <SettingRow>
                <SettingLabel>Default status</SettingLabel>
                <SettingSelect
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s === "all" ? "All Status" : s}
                    </option>
                  ))}
                </SettingSelect>
              </SettingRow>
            </SettingsSection>
          </SettingsPanel>
        )}

        {showForm && (
          <ModalBackdrop>
            <ModalBox>
              <ModalHead>
                {editMode ? (
                  <>
                    <FaUserEdit /> Edit User
                  </>
                ) : (
                  <>
                    <FaUserPlus /> Add New User
                  </>
                )}
                <CloseX
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  &times;
                </CloseX>
              </ModalHead>
              <ModalBody>
                <FormGrid onSubmit={handleSubmit}>
                  <FieldGroup>
                    <FieldLabel>Full Name *</FieldLabel>
                    <FieldInput
                      type="text"
                      placeholder="Enter full name"
                      value={newUser.name}
                      onChange={(e) =>
                        setNewUser({ ...newUser, name: e.target.value })
                      }
                      required
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Email Address *</FieldLabel>
                    <FieldInput
                      type="email"
                      placeholder="user@example.com"
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser({ ...newUser, email: e.target.value })
                      }
                      required
                    />
                  </FieldGroup>
                  <FieldGroup style={{ position: "relative" }}>
                    <FieldLabel>
                      {editMode
                        ? "New Password (leave blank to keep)"
                        : "Password *"}
                    </FieldLabel>
                    <FieldInput
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        editMode
                          ? "Leave blank to keep current"
                          : "Enter password"
                      }
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                      required={!editMode}
                      style={{ paddingRight: "2.5rem" }}
                    />
                    <PassToggle
                      onClick={() => setShowPassword((v) => !v)}
                      type="button"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </PassToggle>
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Role *</FieldLabel>
                    <FieldSelect
                      value={newUser.role}
                      onChange={(e) =>
                        setNewUser({ ...newUser, role: e.target.value })
                      }
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </FieldSelect>
                  </FieldGroup>
                  <FormActions>
                    <SubmitBtn type="submit" disabled={loading}>
                      {loading
                        ? "Processing"
                        : editMode
                          ? "Update User"
                          : "Add User"}
                    </SubmitBtn>
                    <CancelBtn
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </CancelBtn>
                  </FormActions>
                </FormGrid>
              </ModalBody>
            </ModalBox>
          </ModalBackdrop>
        )}

        {showPermissions && selectedUserForPermissions && (
          <ModalBackdrop>
            <ModalBox wide>
              <ModalHead>
                <FaShieldAlt /> Permissions — {selectedUserForPermissions.name}
                <CloseX
                  onClick={() => {
                    setShowPermissions(false);
                    setSelectedUserForPermissions(null);
                  }}
                >
                  &times;
                </CloseX>
              </ModalHead>
              <ModalBody>
                <PermissionManager
                  userId={selectedUserForPermissions._id}
                  currentPermissions={selectedUserForPermissions.permissions}
                  onUpdate={handleUpdatePermissions}
                  allStaff={users.filter((u) => u.role !== "retailer")}
                  targetUserId={selectedUserForPermissions._id}
                />
              </ModalBody>
            </ModalBox>
          </ModalBackdrop>
        )}
      </PageWrapper>
    </Layout>
  );
};

/* ================================================================ STYLED COMPONENTS ================================================================ */

const PageWrapper = styled.div`
  padding: 1.5rem 2rem;
  min-height: 100vh;
  background: var(--nb-white);
`;

const PageHeaderBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--nb-border);
`;

const PageTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  h1 {
    font-size: 1.6rem;
    color: var(--nb-ink);
    margin: 0;
  }
  svg {
    color: var(--nb-ink);
  }
`;

const TabRow = styled.div`
  display: flex;
  gap: 0.5rem;
  background: var(--nb-muted);
  padding: 0.3rem;
  border-radius: var(--nb-radius);
  border: 1px solid var(--nb-border);
`;

const TabBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 1rem;
  border: none;
  border-radius: calc(var(--nb-radius) - 2px);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  background: ${(p) => (p.active ? "var(--nb-blue)" : "transparent")};
  color: ${(p) => (p.active ? "var(--nb-white)" : "var(--nb-ink)")};
  transition: all var(--nb-transition);
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const RefreshBtn = styled.button`
  background: var(--nb-muted);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--nb-ink);
  &:hover {
    background: var(--nb-blue);
    color: var(--nb-white);
  }
`;

const ExportBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  background: var(--nb-muted);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--nb-shadow-sm);
  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const AddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.1rem;
  background: var(--nb-blue);
  color: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--nb-shadow-sm);
  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const Alert = styled.div`
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: var(--nb-radius-sm);
  font-weight: 500;
  background: var(--nb-muted);
  border-left: 4px solid
    ${(p) => (p.type === "error" ? "var(--nb-orange)" : "var(--nb-blue)")};
  color: ${(p) => (p.type === "error" ? "var(--nb-orange)" : "var(--nb-ink)")};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div`
  background: var(--nb-cream);
  border: 1px solid var(--nb-border);
  border-left: 5px solid ${(p) => p.accent || "var(--nb-blue)"};
  border-radius: var(--nb-radius);
  padding: 1rem 1.25rem;
  box-shadow: var(--nb-shadow-sm);
  .val {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--nb-ink);
  }
  .lbl {
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--nb-blue-medium);
    letter-spacing: 0.5px;
    margin-top: 0.25rem;
  }
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: var(--nb-cream);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius);
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 200px;
  background: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  padding: 0.4rem 0.75rem;
  svg {
    color: var(--nb-ink);
    flex-shrink: 0;
  }
  input {
    border: none;
    outline: none;
    background: transparent;
    width: 100%;
    font-size: 0.9rem;
    color: var(--nb-ink);
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const FilterLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--nb-ink);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;
`;

const FilterSelect = styled.select`
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  background: var(--nb-white);
  color: var(--nb-ink);
  font-size: 0.85rem;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: var(--nb-blue);
  }
`;

const ViewToggle = styled.div`
  display: flex;
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  overflow: hidden;
`;

const ViewBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.75rem;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${(p) => (p.active ? "var(--nb-blue)" : "var(--nb-white)")};
  color: ${(p) => (p.active ? "var(--nb-white)" : "var(--nb-ink)")};
  transition: all var(--nb-transition);
`;

const BulkBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  background: var(--nb-cream);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  margin-bottom: 0.75rem;
  span {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--nb-ink);
  }
`;

const BulkBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--nb-shadow-sm);
  background: ${(p) => (p.danger ? "var(--nb-orange)" : "var(--nb-white)")};
  color: ${(p) => (p.danger ? "var(--nb-white)" : "var(--nb-ink)")};
`;

const ResultsInfo = styled.div`
  font-size: 0.8rem;
  color: var(--nb-blue-medium);
  margin-bottom: 0.5rem;
`;

const TableWrapper = styled.div`
  background: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius);
  box-shadow: var(--nb-shadow-md);
  overflow-x: auto;
`;

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
  th {
    background: var(--nb-muted);
    color: var(--nb-ink);
    font-weight: 700;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--nb-border);
    text-align: left;
    user-select: none;
    white-space: nowrap;
    svg {
      font-size: 0.65rem;
      margin-left: 0.3rem;
      vertical-align: middle;
    }
  }
  td {
    padding: 0.7rem 1rem;
    border-bottom: 1px solid var(--nb-border);
    color: var(--nb-ink);
    font-size: 0.875rem;
    vertical-align: middle;
  }
  tr.alt td {
    background: var(--nb-muted);
  }
  tbody tr:hover td {
    background: var(--nb-cream);
  }
`;

const UserCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  .uname {
    font-weight: 600;
    color: var(--nb-ink);
  }
`;

const AvatarCircle = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${(p) => (p.role === "admin" ? "var(--nb-blue)" : "var(--nb-muted)")};
  color: ${(p) => (p.role === "admin" ? "var(--nb-white)" : "var(--nb-ink)")};
  border: 1px solid var(--nb-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
`;

const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  background: ${(p) => (p.active ? "var(--nb-blue)" : "var(--nb-border)")};
  border: 1px solid var(--nb-border);
`;

const RoleBadge = styled.span`
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: capitalize;
  border: 1px solid var(--nb-border);
  background: ${(p) => (p.role === "admin" ? "var(--nb-blue)" : "var(--nb-cream)")};
  color: ${(p) => (p.role === "admin" ? "var(--nb-white)" : "var(--nb-ink)")};
`;

const ActionBtns = styled.div`
  display: flex;
  gap: 0.3rem;
`;

const IconBtn = styled.button`
  width: 30px;
  height: 30px;
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  background: ${(p) => (p.danger ? "var(--nb-orange)" : p.accent ? "var(--nb-blue)" : "var(--nb-muted)")};
  color: ${(p) => (p.danger || p.accent ? "var(--nb-white)" : "var(--nb-ink)")};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all var(--nb-transition);
  box-shadow: var(--nb-shadow-sm);
  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
`;

const UserCard = styled.div`
  background: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius);
  padding: 1.25rem;
  box-shadow: var(--nb-shadow-md);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  transition:
    transform var(--nb-transition),
    box-shadow var(--nb-transition);
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-lg);
  }
`;

const CardCheck = styled.div`
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
`;

const BigAvatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${(p) => (p.role === "admin" ? "var(--nb-blue)" : "var(--nb-muted)")};
  color: ${(p) => (p.role === "admin" ? "var(--nb-white)" : "var(--nb-ink)")};
  border: 1px solid var(--nb-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  box-shadow: var(--nb-shadow-sm);
`;

const CardName = styled.div`
  font-weight: 700;
  font-size: 1rem;
  color: var(--nb-ink);
  text-align: center;
`;
const CardEmail = styled.div`
  font-size: 0.75rem;
  color: var(--nb-blue-medium);
  text-align: center;
  word-break: break-all;
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid var(--nb-border);
  background: ${(p) => (p.active ? "var(--nb-blue-light)" : "var(--nb-muted)")};
  color: ${(p) => (p.active ? "var(--nb-ink)" : "var(--nb-border)")};
`;

const CardJoined = styled.div`
  font-size: 0.7rem;
  color: var(--nb-blue-medium);
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const CardActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: center;
  margin-top: 0.5rem;
`;

const CardActionBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.65rem;
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--nb-shadow-sm);
  background: ${(p) => (p.danger ? "var(--nb-orange)" : p.accent ? "var(--nb-blue)" : "var(--nb-cream)")};
  color: ${(p) => (p.danger || p.accent ? "var(--nb-white)" : "var(--nb-ink)")};
  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1.25rem;
  flex-wrap: wrap;
`;

const PagBtn = styled.button`
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  background: ${(p) => (p.active ? "var(--nb-blue)" : "var(--nb-white)")};
  color: ${(p) => (p.active ? "var(--nb-white)" : "var(--nb-ink)")};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: ${(p) => (p.disabled ? "not-allowed" : "pointer")};
  opacity: ${(p) => (p.disabled ? 0.4 : 1)};
  &:hover:not([disabled]) {
    background: var(--nb-muted);
  }
`;

const SettingsPanel = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const SettingsSection = styled.div`
  background: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius);
  padding: 1.25rem;
  box-shadow: var(--nb-shadow-md);
`;

const SectionTitle = styled.h3`
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--nb-ink);
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--nb-border);
`;

const ColumnToggles = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ToggleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0;
`;

const ToggleLabel = styled.span`
  font-size: 0.85rem;
  color: var(--nb-ink);
  font-weight: 500;
`;

const ToggleSwitch = styled.button`
  width: 42px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid var(--nb-border);
  background: ${(p) => (p.active ? "var(--nb-blue)" : "var(--nb-muted)")};
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  span {
    position: absolute;
    top: 1px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--nb-white);
    border: 1px solid var(--nb-border);
    left: ${(p) => (p.active ? "calc(100% - 18px)" : "1px")};
    transition: left 0.2s;
  }
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0;
  & + & {
    border-top: 1px solid var(--nb-border);
  }
`;

const SettingLabel = styled.span`
  font-size: 0.85rem;
  color: var(--nb-ink);
  font-weight: 500;
`;

const SettingSelect = styled.select`
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  background: var(--nb-white);
  color: var(--nb-ink);
  font-size: 0.85rem;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: var(--nb-blue);
  }
`;

const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
`;

const ModalBox = styled.div`
  position: relative;
  background: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-lg);
  width: 100%;
  max-width: ${(p) => (p.wide ? "1100px" : "500px")};
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--nb-shadow-lg);
`;

const ModalHead = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  background: var(--nb-muted);
  border-bottom: 1px solid var(--nb-border);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--nb-ink);
  svg {
    color: var(--nb-blue);
  }
`;

const CloseX = styled.button`
  margin-left: auto;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--nb-ink);
  cursor: pointer;
  line-height: 1;
  &:hover {
    color: var(--nb-orange);
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const FormGrid = styled.form`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const FieldLabel = styled.label`
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--nb-ink);
`;

const FieldInput = styled.input`
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  background: var(--nb-white);
  color: var(--nb-ink);
  font-size: 0.9rem;
  &:focus {
    outline: none;
    border-color: var(--nb-blue);
    box-shadow: var(--nb-shadow-sm);
  }
`;

const FieldSelect = styled.select`
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  background: var(--nb-white);
  color: var(--nb-ink);
  font-size: 0.9rem;
  &:focus {
    outline: none;
    border-color: var(--nb-blue);
  }
`;

const PassToggle = styled.button`
  position: absolute;
  right: 0.6rem;
  bottom: 0.55rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--nb-ink);
  font-size: 0.9rem;
`;

const FormActions = styled.div`
  grid-column: 1 / -1;
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const SubmitBtn = styled.button`
  flex: 1;
  padding: 0.7rem;
  background: var(--nb-blue);
  color: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--nb-shadow-sm);
  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--nb-shadow-md);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const CancelBtn = styled.button`
  padding: 0.7rem 1.25rem;
  background: var(--nb-muted);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--nb-shadow-sm);
  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const LoadingState = styled.div`
  padding: 3rem;
  text-align: center;
  color: var(--nb-ink);
  .spinner {
    width: 36px;
    height: 36px;
    border: 4px solid var(--nb-muted);
    border-top: 4px solid var(--nb-blue);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: var(--nb-ink);
  svg {
    color: var(--nb-blue);
    margin-bottom: 1rem;
  }
`;

export default Users;
