import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Loader2, Mail, MailOpen, Reply, ShieldAlert, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CustomSelect from '../components/CustomSelect';

const MESSAGE_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'New', label: 'New' },
  { value: 'Read', label: 'Read' },
  { value: 'Replied', label: 'Replied' },
  { value: 'Archived', label: 'Archived' },
];

const STATUS_BADGES = {
  New: 'border-amber-200 bg-amber-50 text-amber-800',
  Read: 'border-blue-200 bg-blue-50 text-blue-800',
  Replied: 'border-green-200 bg-green-50 text-green-800',
  Archived: 'border-gray-200 bg-gray-100 text-gray-700',
};

const AdminMessagesPage = () => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const canManageMessages = Boolean(
    userInfo?.isAdmin ||
      userInfo?.permissions?.includes('orders:read') ||
      userInfo?.permissions?.includes('orders:write') ||
      userInfo?.permissions?.includes('*')
  );

  const [messages, setMessages] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeAction, setActiveAction] = useState('');

  useEffect(() => {
    if (!userInfo?.token) {
      navigate('/login?redirect=/admin/messages');
      return;
    }

    if (!canManageMessages) {
      navigate('/profile');
    }
  }, [canManageMessages, navigate, userInfo]);

  useEffect(() => {
    if (!userInfo?.token || !canManageMessages) {
      return;
    }

    const loadMessages = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await axios.get('/api/contact/admin/all', {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
          params: statusFilter ? { status: statusFilter } : undefined,
        });

        setMessages(data);
      } catch (loadError) {
        console.error(loadError);
        setError(loadError.response?.data?.message || 'Unable to load contact messages right now.');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [canManageMessages, statusFilter, userInfo]);

  const updateMessageStatus = async (messageId, status) => {
    setActiveAction(`${messageId}:${status}`);
    setError('');
    setSuccessMessage('');

    try {
      await axios.put(
        `/api/contact/admin/${messageId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message._id === messageId ? { ...message, status } : message
        )
      );
      setSuccessMessage(`Message marked as ${status}.`);
    } catch (updateError) {
      console.error(updateError);
      setError(updateError.response?.data?.message || 'Unable to update message status.');
    } finally {
      setActiveAction('');
    }
  };

  const deleteMessage = async (messageId, subject) => {
    const confirmed = window.confirm(
      `Delete the message "${subject}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setActiveAction(`${messageId}:delete`);
    setError('');
    setSuccessMessage('');

    try {
      await axios.delete(`/api/contact/admin/${messageId}`, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      });

      setMessages((currentMessages) =>
        currentMessages.filter((message) => message._id !== messageId)
      );
      setSuccessMessage('Message deleted successfully.');
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError.response?.data?.message || 'Unable to delete this message.');
    } finally {
      setActiveAction('');
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] py-10">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Link
            to="/admin"
            className="inline-flex items-center text-sm font-semibold text-brand-primary transition-colors duration-200 hover:text-brand-dark"
          >
            <ArrowLeft size={16} className="mr-2" /> Back to Admin Dashboard
          </Link>
        </div>

        <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_20px_60px_rgba(11,31,58,0.08)]">
          <section className="bg-gradient-to-r from-brand-dark via-brand-primary to-brand-accent px-6 py-10 text-white sm:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/80">Admin Inbox</p>
            <h1 className="mt-4 font-serif text-4xl font-bold">Customer Contact Messages</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 sm:text-base">
              Review customer questions, mark follow-up status, and keep the brand experience polished from first message to final reply.
            </p>
          </section>

          <div className="px-6 py-8 sm:px-10">
            <div className="flex flex-col gap-4 rounded-[28px] border border-gray-100 bg-gradient-to-br from-white to-brand-light p-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-accent">Message Filters</p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark">Inbox controls</h2>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block min-w-[220px]">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                    Status
                  </span>
                  <CustomSelect
                    value={statusFilter}
                    onChange={(nextValue) => {
                      setError('');
                      setSuccessMessage('');
                      setStatusFilter(nextValue);
                    }}
                    options={MESSAGE_STATUS_OPTIONS}
                  />
                </label>

                <div className="rounded-2xl border border-brand-accent/20 bg-white px-4 py-3 text-sm text-gray-500">
                  <span className="font-semibold text-brand-dark">{messages.length}</span> visible messages
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {successMessage}
              </div>
            )}

            {loading ? (
              <div className="mt-8 space-y-4">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-36 animate-pulse rounded-[28px] bg-brand-light" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="mt-8 rounded-[28px] border border-dashed border-brand-accent/30 bg-brand-light px-6 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-primary shadow-sm">
                  <Mail size={28} />
                </div>
                <p className="mt-6 font-serif text-3xl font-bold text-brand-dark">No messages match this filter</p>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-gray-500">
                  New customer questions will appear here once visitors begin using the contact form.
                </p>
              </div>
            ) : (
              <div className="mt-8 space-y-5">
                {messages.map((message) => {
                  const badgeClass = STATUS_BADGES[message.status] || STATUS_BADGES.New;

                  return (
                    <article
                      key={message._id}
                      className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${badgeClass}`}>
                              {message.status}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                              {new Date(message.createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <h2 className="mt-4 font-serif text-2xl font-bold text-brand-dark">
                            {message.subject}
                          </h2>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                            <span className="font-semibold text-brand-dark">{message.name}</span>
                            <span>{message.email}</span>
                            {message.phone && <span>{message.phone}</span>}
                          </div>

                          <div className="mt-4 rounded-2xl bg-brand-light p-4 text-sm leading-7 text-gray-700">
                            {message.message}
                          </div>
                        </div>

                        <div className="flex w-full flex-col gap-3 xl:w-[260px]">
                          {[
                            ['Read', MailOpen],
                            ['Replied', Reply],
                            ['Archived', ShieldAlert],
                          ].map(([status, Icon]) => {
                            const isActive = activeAction === `${message._id}:${status}`;
                            const disabled = isActive || message.status === status;

                            return (
                              <button
                                key={status}
                                type="button"
                                disabled={disabled}
                                onClick={() => updateMessageStatus(message._id, status)}
                                className="inline-flex items-center justify-center rounded-xl border border-brand-primary/15 px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isActive ? (
                                  <Loader2 size={16} className="mr-2 animate-spin" />
                                ) : (
                                  <Icon size={16} className="mr-2" />
                                )}
                                Mark {status}
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            disabled={activeAction === `${message._id}:delete`}
                            onClick={() => deleteMessage(message._id, message.subject)}
                            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-red-700 transition-colors duration-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {activeAction === `${message._id}:delete` ? (
                              <Loader2 size={16} className="mr-2 animate-spin" />
                            ) : (
                              <Trash2 size={16} className="mr-2" />
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMessagesPage;
