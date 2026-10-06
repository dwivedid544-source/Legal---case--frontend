import { useState, useEffect, useRef } from 'react';
import api, { API_BASE_URL } from '../services/api';

export default function OutlookEventComposer({ isOpen, eventData, onClose, onSave, toast, lookups = {} }) {
  // Outlook State variables
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('08:30');
  const [isAllDay, setIsAllDay] = useState(false);
  const [timezone, setTimezone] = useState('UTC');
  const [busyStatus, setBusyStatus] = useState('busy');
  const [importance, setImportance] = useState('normal'); // low, normal, high
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState('meeting');
  const [matterId, setMatterId] = useState('');
  const [reminderOffset, setReminderOffset] = useState('15_min');
  const [customReminder, setCustomReminder] = useState('');

  // Attendees Lists
  const [internalRequired, setInternalRequired] = useState([]);
  const [internalOptional, setInternalOptional] = useState([]);
  const [externalRequired, setExternalRequired] = useState('');
  const [externalOptional, setExternalOptional] = useState('');
  const [searchReqText, setSearchReqText] = useState('');
  const [searchOptText, setSearchOptText] = useState('');
  const [showReqDropdown, setShowReqDropdown] = useState(false);
  const [showOptDropdown, setShowOptDropdown] = useState(false);
  const [showOptionalRow, setShowOptionalRow] = useState(false);

  // Recurrence (Series vs Occurrence)
  const [recurrencePattern, setRecurrencePattern] = useState('none'); // none, daily, weekly, monthly, yearly
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceDays, setRecurrenceDays] = useState([]);
  const [recurrenceEndType, setRecurrenceEndType] = useState('never'); // never, count, date
  const [recurrenceCount, setRecurrenceCount] = useState(10);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [showRecurrencePopover, setShowRecurrencePopover] = useState(false);

  // Categories
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);

  // Attachments
  const [attachments, setAttachments] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Lookup data
  const [matters, setMatters] = useState([]);
  const [dateTimeExpanded, setDateTimeExpanded] = useState(false);

  // Dropdown Popovers
  const [showBusyDropdown, setShowBusyDropdown] = useState(false);
  const [showReminderDropdown, setShowReminderDropdown] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const [showImportanceDropdown, setShowImportanceDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // Rich Text Editor Ref & History
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const typingTimeoutRef = useRef(null);

  // Mention Autocomplete
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionRange, setMentionRange] = useState(null);

  // Emoji Popover
  const [showEmojiPopover, setShowEmojiPopover] = useState(false);

  const fontFamilies = ['Arial', 'Calibri', 'Times New Roman', 'Segoe UI', 'Courier New', 'Georgia', 'Verdana'];
  const fontSizes = ['10px', '12px', '14px', '16px', '18px', '20px', '24px'];

  // Active toolbar states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrike, setIsStrike] = useState(false);
  const [isBullet, setIsBullet] = useState(false);
  const [isNumber, setIsNumber] = useState(false);
  const [alignState, setAlignState] = useState('left');

  const savedRangeRef = useRef(null);

  const getEventTypeFromCategories = (cats) => {
    if (cats.includes('Hearing')) return 'hearing';
    if (cats.includes('Meeting')) return 'meeting';
    if (cats.includes('Deadline')) return 'filing_deadline';
    if (cats.includes('Consultation')) return 'consultation';
    if (cats.includes('Case Review')) return 'meeting';
    if (cats.includes('Personal')) return 'meeting';
    return 'meeting';
  };

  // Custom Undo/Redo state managers
  const saveStateToHistory = (html) => {
    if (historyIndexRef.current >= 0 && historyRef.current[historyIndexRef.current] === html) {
      return;
    }
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(html);
    if (nextHistory.length > 100) {
      nextHistory.shift();
    } else {
      historyIndexRef.current += 1;
    }
    historyRef.current = nextHistory;
  };

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const html = historyRef.current[historyIndexRef.current];
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
        restoreCursorAtEnd();
      }
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const html = historyRef.current[historyIndexRef.current];
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
        restoreCursorAtEnd();
      }
    }
  };

  // Handle Selection updates
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      let node = range.commonAncestorContainer;
      while (node) {
        if (node === editorRef.current) {
          savedRangeRef.current = range;
          break;
        }
        node = node.parentNode;
      }
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    let isAlreadyFocused = false;
    if (sel && sel.rangeCount > 0) {
      let node = sel.getRangeAt(0).commonAncestorContainer;
      while (node) {
        if (node === editorRef.current) {
          isAlreadyFocused = true;
          break;
        }
        node = node.parentNode;
      }
    }

    if (isAlreadyFocused) {
      return;
    }

    if (savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
      editorRef.current?.focus();
    } else {
      editorRef.current?.focus();
      if (sel && sel.rangeCount === 0 && editorRef.current) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        savedRangeRef.current = range;
      }
    }
  };

  const expandSelectionToWord = (sel) => {
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = node.data;
    const offset = range.startOffset;

    let start = offset;
    while (start > 0 && /[a-zA-Z0-9_]/.test(text[start - 1])) {
      start--;
    }

    let end = offset;
    while (end < text.length && /[a-zA-Z0-9_]/.test(text[end])) {
      end++;
    }

    if (start !== end) {
      const newRange = document.createRange();
      newRange.setStart(node, start);
      newRange.setEnd(node, end);
      sel.removeAllRanges();
      sel.addRange(newRange);
      savedRangeRef.current = newRange;
    }
  };

  const updateToolbarActiveStates = () => {
    if (!editorRef.current) return;
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsUnderline(document.queryCommandState('underline'));
    setIsStrike(document.queryCommandState('strikeThrough'));
    setIsBullet(document.queryCommandState('insertUnorderedList'));
    setIsNumber(document.queryCommandState('insertOrderedList'));
    
    if (document.queryCommandState('justifyLeft')) setAlignState('left');
    else if (document.queryCommandState('justifyCenter')) setAlignState('center');
    else if (document.queryCommandState('justifyRight')) setAlignState('right');
    else if (document.queryCommandState('justifyFull')) setAlignState('justify');
  };

  const handleEditorSelectionChange = () => {
    saveSelection();
    updateToolbarActiveStates();
  };

  const openDropdown = (e, setter) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY,
      left: Math.min(rect.left + window.scrollX, window.innerWidth - 320)
    });
    setter(prev => !prev);
  };

  const restoreCursorAtEnd = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (typeof window.getSelection !== 'undefined' && typeof document.createRange !== 'undefined') {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const getSelectionParentElement = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      let node = sel.getRangeAt(0).startContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeType === 1 && node.tagName.toLowerCase() === 'blockquote') {
          return node;
        }
        node = node.parentNode;
      }
    }
    return null;
  };

  const handleQuoteToggle = () => {
    const blockquote = getSelectionParentElement();
    if (blockquote) {
      execCommand('formatBlock', '<p>');
    } else {
      execCommand('formatBlock', '<blockquote>');
    }
  };

  // Fetch Matters
  useEffect(() => {
    document.addEventListener('selectionchange', handleEditorSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleEditorSelectionChange);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          const [mattersRes, catsRes] = await Promise.all([
            api.matters.list({ limit: 500 }),
            api.calendar.listCategories()
          ]);
          setMatters(mattersRes.data || []);
          setAvailableCategories(catsRes.data || []);
        } catch (e) {
          console.error('Failed to load matters or categories', e);
        }
      })();
    }
  }, [isOpen]);

  // Load existing event data if editing
  useEffect(() => {
    if (eventData) {
      setTitle(eventData.title || '');
      const evDate = eventData.date ? new Date(eventData.date) : new Date();
      setStartDate(evDate.toISOString().split('T')[0]);
      
      const hours = String(evDate.getHours()).padStart(2, '0');
      const minutes = String(evDate.getMinutes()).padStart(2, '0');
      setStartTime(`${hours}:${minutes}`);

      if (eventData.end_date) {
        const endEvDate = new Date(eventData.end_date);
        setEndDate(endEvDate.toISOString().split('T')[0]);
        const endHours = String(endEvDate.getHours()).padStart(2, '0');
        const endMinutes = String(endEvDate.getMinutes()).padStart(2, '0');
        setEndTime(`${endHours}:${endMinutes}`);
      }

      setIsAllDay(eventData.is_all_day || false);
      setTimezone(eventData.timezone || 'UTC');
      setBusyStatus(eventData.busy_status || 'busy');
      setImportance(eventData.importance || 'normal');
      setLocation(eventData.location || '');
      setEventType(eventData.type || 'meeting');
      setMatterId(eventData.matter_id || '');
      setReminderOffset(eventData.reminder_date ? 'custom' : '');
      if (eventData.reminder_date) {
        setCustomReminder(new Date(eventData.reminder_date).toISOString().slice(0, 16));
      }

      // Attendees
      if (eventData.attendees) {
        const req = [];
        const opt = [];
        const extReq = [];
        const extOpt = [];

        eventData.attendees.forEach(a => {
          if (a.user_id) {
            const userObj = lookups.users?.find(u => u.id === a.user_id);
            if (userObj) {
              if (a.is_optional) {
                opt.push(userObj);
                setShowOptionalRow(true);
              } else {
                req.push(userObj);
              }
            }
          } else if (a.email) {
            if (a.is_optional) {
              extOpt.push(a.email);
              setShowOptionalRow(true);
            } else {
              extReq.push(a.email);
            }
          }
        });

        setInternalRequired(req);
        setInternalOptional(opt);
        setExternalRequired(extReq.join(', '));
        setExternalOptional(extOpt.join(', '));
      }

      // Recurrence rule
      if (eventData.recurrence_rule) {
        try {
          const rule = JSON.parse(eventData.recurrence_rule);
          if (rule) {
            setRecurrencePattern(rule.pattern?.type || 'none');
            setRecurrenceInterval(rule.pattern?.interval || 1);
            setRecurrenceDays(rule.pattern?.daysOfWeek || []);
            if (rule.range) {
              setRecurrenceEndType(rule.range.type || 'never');
              setRecurrenceCount(rule.range.numberOfOccurrences || 10);
              if (rule.range.endDate) {
                setRecurrenceEndDate(new Date(rule.range.endDate).toISOString().split('T')[0]);
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      }

      // Categories
      if (eventData.categories) {
        try {
          const cats = typeof eventData.categories === 'string' ? JSON.parse(eventData.categories) : eventData.categories;
          setSelectedCategories(cats || []);
        } catch (e) {
          console.error(e);
        }
      } else if (eventData.type) {
        const typeMap = {
          'hearing': 'Hearing',
          'meeting': 'Meeting',
          'filing_deadline': 'Deadline',
          'consultation': 'Consultation'
        };
        if (typeMap[eventData.type]) {
          setSelectedCategories([typeMap[eventData.type]]);
        }
      }

      // Attachments
      if (eventData.attachments) {
        try {
          const atts = typeof eventData.attachments === 'string' ? JSON.parse(eventData.attachments) : eventData.attachments;
          setAttachments(atts || []);
        } catch (e) {
          console.error(e);
        }
      }

      setTimeout(() => {
        if (editorRef.current) {
          const initialDesc = eventData.description || '';
          editorRef.current.innerHTML = initialDesc;
          historyRef.current = [initialDesc];
          historyIndexRef.current = 0;
        }
      }, 100);
    } else {
      // Clear all
      setTitle('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setStartTime('08:00');
      setEndDate(new Date().toISOString().split('T')[0]);
      setEndTime('08:30');
      setIsAllDay(false);
      setTimezone('UTC');
      setBusyStatus('busy');
      setImportance('normal');
      setLocation('');
      setEventType('meeting');
      setMatterId('');
      setReminderOffset('15_min');
      setCustomReminder('');
      setInternalRequired([]);
      setInternalOptional([]);
      setExternalRequired('');
      setExternalOptional('');
      setShowOptionalRow(false);
      setRecurrencePattern('none');
      setSelectedCategories([]);
      setAttachments([]);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
          historyRef.current = [''];
          historyIndexRef.current = 0;
        }
      }, 100);
    }
  }, [eventData, isOpen, lookups.users]);

  if (!isOpen) return null;

  // Formatting clock text
  const formatClockRowText = () => {
    try {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dateObj = new Date(`${startDate}T${startTime}`);
      const dayName = days[dateObj.getDay()];
      const localeDate = dateObj.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' });
      
      const formatTime12 = (time24) => {
        const [h, m] = time24.split(':');
        let hours = parseInt(h);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${m} ${ampm}`;
      };

      if (isAllDay) {
        return `${dayName} ${localeDate} - All Day`;
      }
      return `${dayName} ${localeDate} ${formatTime12(startTime)} - ${formatTime12(endTime)}`;
    } catch {
      return 'Set Date and Time';
    }
  };

  // Rich Text Editor utilities
  const execCommand = (command, value = null) => {
    restoreSelection();

    const wordLevelCommands = ['bold', 'italic', 'underline', 'strikeThrough', 'foreColor', 'hiliteColor', 'fontName', 'fontSize'];
    const sel = window.getSelection();
    if (sel && sel.isCollapsed && wordLevelCommands.includes(command)) {
      expandSelectionToWord(sel);
    }

    document.execCommand(command, false, value);
    editorRef.current?.focus();
    saveStateToHistory(editorRef.current?.innerHTML || '');
    updateToolbarActiveStates();
  };

  const handleLinkInsert = () => {
    const url = prompt('Enter the link URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const insertEmoji = (emoji) => {
    execCommand('insertText', emoji);
    setShowEmojiPopover(false);
  };

  const handleEditorInput = () => {
    const html = editorRef.current?.innerHTML || '';
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      saveStateToHistory(html);
    }, 500);
  };

  // Custom editor keyboard shortcut interceptor
  const handleEditorKeyDown = (e) => {
    // Space or Enter should immediately save history state
    if (e.key === ' ' || e.key === 'Enter') {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      saveStateToHistory(editorRef.current?.innerHTML || '');
    }

    // Ctrl/Cmd shortkeys
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if (key === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (key === 'b') { e.preventDefault(); execCommand('bold'); }
      if (key === 'i') { e.preventDefault(); execCommand('italic'); }
      if (key === 'u') { e.preventDefault(); execCommand('underline'); }
    }
    
    // Autocomplete mentions panel trigger
    if (e.key === '@') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        setMentionRange(range.cloneRange());
        setShowMentionList(true);
        setMentionQuery('');
      }
    } else if (showMentionList) {
      if (e.key === 'Escape') {
        setShowMentionList(false);
      } else if (e.key === 'Backspace' && mentionQuery === '') {
        setShowMentionList(false);
      } else if (e.key === 'Enter') {
        // Intercept enter to choose top user if results exist
        e.preventDefault();
        const matches = getMentionMatches();
        if (matches.length > 0) {
          selectMentionUser(matches[0]);
        }
      } else if (e.key.length === 1) {
        setMentionQuery(prev => prev + e.key);
      }
    }
  };

  const getMentionMatches = () => {
    return (lookups.users || []).filter(u => 
      u.full_name.toLowerCase().includes(mentionQuery.toLowerCase())
    );
  };

  const selectMentionUser = (userObj) => {
    if (!mentionRange) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(mentionRange);
    
    // Delete the typed '@' key
    document.execCommand('delete', false);
    
    // Insert mention chip
    const chipHtml = `<span class="mention inline-block px-1.5 py-0.5 bg-[#0057c7]/20 text-[#38bdf8] border border-[#0057c7]/30 rounded font-semibold text-[13px]" contenteditable="false" data-id="${userObj.id}">@${userObj.full_name}</span>&nbsp;`;
    document.execCommand('insertHTML', false, chipHtml);
    
    setShowMentionList(false);
    setMentionRange(null);
    saveStateToHistory(editorRef.current?.innerHTML || '');
  };

  // Upload inline images (non-base64) & clipboard file paste
  const uploadAndInsertImage = async (file) => {
    if (file.size > 30 * 1024 * 1024) {
      toast('Inline image file size exceeds 30 MB limit', 'error');
      return;
    }

    const form = new FormData();
    form.append('files', file);

    try {
      const res = await api.documents.createBulk(form);
      const doc = res.data?.[0];
      if (doc && doc.file_name) {
        const cleanApiUrl = API_BASE_URL.replace(/\/api$/, '');
        const imgUrl = `${cleanApiUrl}/uploads/documents/${doc.file_name}`;
        const imgTag = `<img src="${imgUrl}" alt="${file.name}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />`;
        execCommand('insertHTML', imgTag);
      }
    } catch (e) {
      toast('Failed to upload inline image: ' + e.message, 'error');
    }
  };

  // Paste handler for Rich Text Editor
  const handleEditorPaste = async (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();

          if (file.type.startsWith('image/')) {
            await uploadAndInsertImage(file);
          } else {
            await uploadAttachmentFile(file);
          }
        }
      }
    }
  };

  // Backend file upload with 30MB limit
  const uploadAttachmentFile = async (file) => {
    if (file.size > 30 * 1024 * 1024) {
      toast(`Attachment file "${file.name}" exceeds 30 MB limit`, 'error');
      return;
    }

    setUploadProgress(10);
    const form = new FormData();
    form.append('files', file);

    try {
      const progressTimer = setInterval(() => {
        setUploadProgress(p => {
          if (p >= 90) {
            clearInterval(progressTimer);
            return 90;
          }
          return p + 15;
        });
      }, 100);

      const res = await api.documents.createBulk(form);
      clearInterval(progressTimer);
      setUploadProgress(100);

      const doc = res.data?.[0];
      if (doc) {
        setAttachments(prev => [...prev, {
          id: doc.id,
          name: doc.original_name,
          size: doc.file_size,
          type: doc.mime_type,
          file_name: doc.file_name
        }]);
      }
      setTimeout(() => setUploadProgress(null), 500);
    } catch (e) {
      setUploadProgress(null);
      toast(`Failed to upload attachment "${file.name}": ` + e.message, 'error');
    }
  };

  // File Upload drag/drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      await uploadAttachmentFile(files[i]);
    }
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      await uploadAttachmentFile(files[i]);
    }
  };

  const handleRemoveAttachment = (id) => {
    setAttachments(prev => prev.filter(x => x.id !== id));
  };

  // Required & Optional autocomplete lookups
  const filteredUsersReq = (lookups.users || []).filter(u => 
    u.full_name.toLowerCase().includes(searchReqText.toLowerCase()) ||
    u.email.toLowerCase().includes(searchReqText.toLowerCase())
  ).filter(u => !internalRequired.some(r => r.id === u.id));

  const filteredUsersOpt = (lookups.users || []).filter(u => 
    u.full_name.toLowerCase().includes(searchOptText.toLowerCase()) ||
    u.email.toLowerCase().includes(searchOptText.toLowerCase())
  ).filter(u => !internalOptional.some(r => r.id === u.id));

  // Toggle Dropdowns with viewport calculation
  const toggleDropdown = (e, dropdownType) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Check if dropdown is already open, if so close it
    let alreadyOpen = false;
    if (dropdownType === 'recurrence' && showRecurrencePopover) alreadyOpen = true;
    if (dropdownType === 'busy' && showBusyDropdown) alreadyOpen = true;
    if (dropdownType === 'reminder' && showReminderDropdown) alreadyOpen = true;
    if (dropdownType === 'categories' && showCategoriesDropdown) alreadyOpen = true;
    if (dropdownType === 'importance' && showImportanceDropdown) alreadyOpen = true;

    // Close all first
    setShowRecurrencePopover(false);
    setShowBusyDropdown(false);
    setShowReminderDropdown(false);
    setShowCategoriesDropdown(false);
    setShowImportanceDropdown(false);

    if (!alreadyOpen) {
      // Calculate best left position so it doesn't overflow screen right edge
      const dropdownWidth = 280; // approximate max dropdown width
      let left = rect.left;
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 16;
      }
      if (left < 16) left = 16;

      setDropdownPos({
        top: rect.bottom + 4,
        left: left
      });

      if (dropdownType === 'recurrence') setShowRecurrencePopover(true);
      if (dropdownType === 'busy') setShowBusyDropdown(true);
      if (dropdownType === 'reminder') setShowReminderDropdown(true);
      if (dropdownType === 'categories') setShowCategoriesDropdown(true);
      if (dropdownType === 'importance') setShowImportanceDropdown(true);
    }
  };

  // Close all popovers
  const closeAllPopovers = () => {
    setShowRecurrencePopover(false);
    setShowBusyDropdown(false);
    setShowReminderDropdown(false);
    setShowCategoriesDropdown(false);
    setShowImportanceDropdown(false);
    setShowEmojiPopover(false);
  };

  // Save/Submit Form
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast('Title is required', 'error');
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    let endDateTime = null;
    if (isAllDay) {
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime = new Date(startDateTime);
      endDateTime.setHours(23, 59, 59, 999);
    } else {
      endDateTime = new Date(`${endDate}T${endTime}:00`);
    }

    // Reminders
    let reminderDate = null;
    if (reminderOffset === 'custom' && customReminder) {
      reminderDate = new Date(customReminder);
    } else if (reminderOffset && reminderOffset !== 'none') {
      const offsetMap = {
        '5_min': 5 * 60 * 1000,
        '10_min': 10 * 60 * 1000,
        '15_min': 15 * 60 * 1000,
        '30_min': 30 * 60 * 1000,
        '1_hour': 60 * 60 * 1000,
        '1_day': 24 * 60 * 60 * 1000
      };
      if (offsetMap[reminderOffset]) {
        reminderDate = new Date(startDateTime.getTime() - offsetMap[reminderOffset]);
      }
    }

    // Recurrence Rule
    let recurrenceRule = null;
    if (recurrencePattern !== 'none') {
      recurrenceRule = JSON.stringify({
        pattern: {
          type: recurrencePattern,
          interval: parseInt(recurrenceInterval, 10),
          daysOfWeek: recurrenceDays
        },
        range: {
          type: recurrenceEndType,
          numberOfOccurrences: recurrenceEndType === 'count' ? parseInt(recurrenceCount, 10) : undefined,
          endDate: recurrenceEndType === 'date' ? recurrenceEndDate : undefined
        }
      });
    }

    const attendees = [
      ...internalRequired.map(u => ({ user_id: u.id, is_optional: false })),
      ...internalOptional.map(u => ({ user_id: u.id, is_optional: true })),
      ...externalRequired.split(',').map(s => s.trim()).filter(Boolean).map(email => ({ email, is_optional: false })),
      ...externalOptional.split(',').map(s => s.trim()).filter(Boolean).map(email => ({ email, is_optional: true }))
    ];

    const data = {
      title,
      date: startDate,
      time: isAllDay ? null : startTime,
      end_date: endDateTime.toISOString(),
      type: eventType,
      matter_id: matterId ? Number(matterId) : null,
      description: editorRef.current?.innerHTML || '',
      reminder_date: reminderDate ? reminderDate.toISOString() : null,
      busy_status: busyStatus,
      is_all_day: isAllDay,
      timezone,
      location,
      importance,
      categories: selectedCategories,
      recurrence_rule: recurrenceRule,
      attachments,
      attendees
    };

    try {
      if (eventData?.id) {
        await api.calendar.update(eventData.id, data);
        toast('Event updated successfully', 'success');
      } else {
        await api.calendar.create(data);
        toast('Event created successfully', 'success');
      }
      onSave();
      onClose();
    } catch (e) {
      toast(e.message || 'Failed to save event', 'error');
    }
  };

  // Delete event
  const handleDelete = async () => {
    if (!eventData?.id) return;
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await api.calendar.remove(eventData.id);
        toast('Event deleted successfully', 'success');
        onSave();
        onClose();
      } catch (e) {
        toast(e.message || 'Failed to delete event', 'error');
      }
    }
  };

  // Print function
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; line-height: 1.6; color: #fff; background: #0b101d; }
            h1 { border-bottom: 2px solid #0057c7; padding-bottom: 10px; color: #fff; }
            .meta { margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; }
            .meta p { margin: 8px 0; font-size: 14px; }
            .description { padding: 15px; border: 1px solid rgba(255,255,255,0.1); background: #0d1323; border-radius: 8px; min-height: 200px; color: #eee; }
          </style>
        </head>
        <body>
          <h1>${title || '(Untitled Event)'}</h1>
          <div class="meta">
            <p><strong>Time:</strong> ${formatClockRowText()}</p>
            <p><strong>Location:</strong> ${location || 'None'}</p>
            <p><strong>Busy Status:</strong> ${busyStatus}</p>
            <p><strong>Importance:</strong> ${importance.toUpperCase()}</p>
          </div>
          <h3>Description</h3>
          <div class="description">${editorRef.current?.innerHTML || ''}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div 
      onClick={closeAllPopovers}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md sm:p-4 p-0 overflow-y-auto"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="bg-[#0b101d] w-full max-w-[800px] sm:rounded-2xl rounded-none flex flex-col h-full sm:h-auto sm:max-h-[92vh] overflow-hidden text-white font-sans border border-white/10 shadow-2xl"
      >
        
        {/* Title Bar */}
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-white/10 bg-white/[0.01]">
          <span className="text-[13px] font-semibold text-white/60">New event</span>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-white/60 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Top Command Bar (Horizontal scroll on mobile) */}
        <div className="bg-[#121826]/90 border-b border-white/10 px-4 sm:px-5 py-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none select-none">
          
          {/* Save Button */}
          <button 
            onClick={handleSubmit} 
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0057c7] hover:bg-[#004bb1] text-white rounded-lg text-[13px] font-semibold shadow-md shadow-[#0057c7]/20 transition-all active:scale-95 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            Save
          </button>

          <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

          {/* Event tab */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-white rounded-lg text-[13px] font-semibold border border-white/10 flex-shrink-0">
            <svg className="w-4 h-4 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Event
          </button>

          {/* Series / Recurrence trigger */}
          <button 
            onClick={(e) => toggleDropdown(e, 'recurrence')}
            className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 rounded-lg text-[13px] text-white/80 transition-all flex-shrink-0 ${recurrencePattern !== 'none' ? 'bg-[#0057c7]/20 text-[#38bdf8] font-semibold border border-[#0057c7]/30' : ''}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" /></svg>
            {recurrencePattern !== 'none' ? 'Repeat Active' : 'Series'}
          </button>

          {/* Busy Dropdown trigger */}
          <button 
            onClick={(e) => toggleDropdown(e, 'busy')}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 rounded-lg text-[13px] text-white/80 transition-all flex-shrink-0"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${busyStatus === 'free' ? 'bg-emerald-500' : busyStatus === 'tentative' ? 'bg-amber-400' : busyStatus === 'oof' ? 'bg-purple-500' : 'bg-red-500'}`} />
            Busy
            <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path d="M19 9l-7 7-7-7" /></svg>
          </button>

          {/* Reminder Dropdown trigger */}
          <button 
            onClick={(e) => toggleDropdown(e, 'reminder')}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 rounded-lg text-[13px] text-white/80 flex-shrink-0"
          >
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Reminder
            <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path d="M19 9l-7 7-7-7" /></svg>
          </button>

          {/* Categories Dropdown trigger */}
          <button 
            onClick={(e) => toggleDropdown(e, 'categories')}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 rounded-lg text-[13px] text-white/80 flex-shrink-0"
          >
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Categories
            <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path d="M19 9l-7 7-7-7" /></svg>
          </button>

          {/* Importance Dropdown trigger */}
          <button 
            onClick={(e) => toggleDropdown(e, 'importance')}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 rounded-lg text-[13px] text-white/80 flex-shrink-0"
          >
            <span className="font-semibold text-red-500">{importance === 'high' ? '!' : importance === 'low' ? '↓' : '—'}</span>
            Importance
            <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path d="M19 9l-7 7-7-7" /></svg>
          </button>

          {/* Print Button */}
          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 rounded-lg text-[13px] text-white/80 flex-shrink-0"
          >
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm0-10V4a2 2 0 012-2h4a2 2 0 012 2v3m-6 0h6" /></svg>
            Print
          </button>

          {/* Delete Action (if editing) */}
          {eventData?.id && (
            <button 
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-500/10 text-red-400 rounded-lg text-[13px] font-semibold transition-all active:scale-95 border border-red-500/20 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          )}

        </div>

        {/* Workspace Panels */}
        <div className="flex-1 overflow-y-auto bg-[#111520] p-4 sm:p-6 space-y-4 sm:space-y-5 custom-scrollbar">
          
          {/* Main Card */}
          <div className="border border-white/5 rounded-xl sm:rounded-2xl bg-white/[0.02] p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-inner">
            
            {/* ROW 1: Title Input */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-5 flex items-center justify-center text-white/30 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
              <div className="flex-1">
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Add title" 
                  className="w-full text-lg sm:text-xl font-bold border-b border-white/10 bg-transparent py-1.5 focus:border-[#38bdf8] outline-none text-white placeholder:text-white/20 transition-all"
                />
              </div>
            </div>

            {/* ROW 2: Required Attendees Input */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 relative">
              <div className="w-5 flex items-center justify-center pt-2.5 text-white/30 flex-shrink-0 hidden sm:flex">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              </div>
              <div className="flex-1 w-full">
                <div className="flex flex-wrap gap-1.5 border-b border-white/10 bg-transparent py-1.5 focus-within:border-[#38bdf8] transition-all">
                  <div className="flex sm:hidden items-center text-white/30 mr-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  </div>
                  {internalRequired.map(userObj => (
                    <span key={userObj.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/5 text-white/80 rounded-full text-[12px] font-semibold border border-white/10 shadow-sm">
                      {userObj.full_name}
                      <button type="button" onClick={() => setInternalRequired(prev => prev.filter(u => u.id !== userObj.id))} className="text-white/40 hover:text-white ml-1">✕</button>
                    </span>
                  ))}
                  <input 
                    type="text"
                    value={searchReqText}
                    onChange={e => { setSearchReqText(e.target.value); setShowReqDropdown(true); }}
                    onFocus={() => setShowReqDropdown(true)}
                    placeholder="Invite required attendees" 
                    className="flex-1 min-w-[150px] bg-transparent outline-none text-[13px] text-white placeholder:text-white/40"
                  />
                  
                  {/* Optional Toggle Button */}
                  <button 
                    type="button" 
                    onClick={() => setShowOptionalRow(!showOptionalRow)}
                    className="text-[11px] font-bold text-[#38bdf8] hover:text-[#0284c7] px-2 ml-auto"
                  >
                    {showOptionalRow ? '- Hide Optional' : '+ Optional'}
                  </button>
                </div>

                {/* Lookup Dropdown */}
                {showReqDropdown && searchReqText && (
                  <div className="absolute left-0 right-0 z-20 mt-1 bg-[#121826] border border-white/10 rounded-xl shadow-xl max-h-44 overflow-y-auto custom-scrollbar">
                    {filteredUsersReq.map(u => (
                      <div
                        key={u.id}
                        onClick={() => { setInternalRequired(prev => [...prev, u]); setSearchReqText(''); setShowReqDropdown(false); }}
                        className="px-4 py-2.5 hover:bg-white/5 cursor-pointer text-[13px] flex items-center justify-between text-white"
                      >
                        <span>{u.full_name} <span className="text-white/40">({u.email})</span></span>
                        <span className="text-[10px] bg-[#0057c7]/20 text-[#38bdf8] font-bold px-2 py-0.5 rounded">Add</span>
                      </div>
                    ))}
                    {filteredUsersReq.length === 0 && (
                      <div className="p-3 text-center text-white/40 italic text-[12px]">No internal users found</div>
                    )}
                  </div>
                )}

                <input 
                  type="text"
                  value={externalRequired}
                  onChange={e => setExternalRequired(e.target.value)}
                  placeholder="External required attendee emails (comma separated)"
                  className="w-full bg-transparent outline-none text-[12px] text-white/40 mt-1.5 placeholder:text-white/20 border-none"
                />
              </div>
            </div>

            {/* ROW 2B: Optional Attendees Input (Conditional) */}
            {showOptionalRow && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 relative sm:pl-9">
                <div className="flex-1 w-full">
                  <div className="flex flex-wrap gap-1.5 border-b border-white/10 bg-transparent py-1.5 focus-within:border-[#38bdf8] transition-all">
                    {internalOptional.map(userObj => (
                      <span key={userObj.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/5 text-white/80 rounded-full text-[12px] font-semibold border border-white/10 shadow-sm">
                        {userObj.full_name}
                        <button type="button" onClick={() => setInternalOptional(prev => prev.filter(u => u.id !== userObj.id))} className="text-white/40 hover:text-white ml-1">✕</button>
                      </span>
                    ))}
                    <input 
                      type="text"
                      value={searchOptText}
                      onChange={e => { setSearchOptText(e.target.value); setShowOptDropdown(true); }}
                      onFocus={() => setShowOptDropdown(true)}
                      placeholder="Invite optional attendees" 
                      className="flex-1 min-w-[150px] bg-transparent outline-none text-[13px] text-white placeholder:text-white/40"
                    />
                  </div>

                  {/* Optional Lookup Dropdown */}
                  {showOptDropdown && searchOptText && (
                    <div className="absolute left-0 right-0 z-20 mt-1 bg-[#121826] border border-white/10 rounded-xl shadow-xl max-h-44 overflow-y-auto custom-scrollbar">
                      {filteredUsersOpt.map(u => (
                        <div
                          key={u.id}
                          onClick={() => { setInternalOptional(prev => [...prev, u]); setSearchOptText(''); setShowOptDropdown(false); }}
                          className="px-4 py-2.5 hover:bg-white/5 cursor-pointer text-[13px] flex items-center justify-between text-white"
                        >
                          <span>{u.full_name} <span className="text-white/40">({u.email})</span></span>
                          <span className="text-[10px] bg-white/10 text-white/60 font-bold px-2 py-0.5 rounded">Add Optional</span>
                        </div>
                      ))}
                      {filteredUsersOpt.length === 0 && (
                        <div className="p-3 text-center text-white/40 italic text-[12px]">No internal users found</div>
                      )}
                    </div>
                  )}

                  <input 
                    type="text"
                    value={externalOptional}
                    onChange={e => setExternalOptional(e.target.value)}
                    placeholder="External optional attendee emails (comma separated)"
                    className="w-full bg-transparent outline-none text-[12px] text-white/40 mt-1.5 placeholder:text-white/20 border-none"
                  />
                </div>
              </div>
            )}

            {/* ROW 3: Date & Time Summary Selector */}
            <div className="space-y-2">
              <div 
                onClick={() => setDateTimeExpanded(!dateTimeExpanded)}
                className="flex items-center gap-3 sm:gap-4 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-all"
              >
                <div className="w-5 flex items-center justify-center text-white/30 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="text-[13px] font-bold text-white/90 truncate">{formatClockRowText()}</span>
                  <span className="text-[11px] text-[#38bdf8] font-bold uppercase tracking-wider flex-shrink-0 ml-2">{dateTimeExpanded ? 'Hide' : 'Change'}</span>
                </div>
              </div>

              {dateTimeExpanded && (
                <div className="sm:pl-9 p-4 sm:p-5 border border-white/5 bg-white/[0.01] rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                  
                  {/* Start Details */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-white/40 font-bold uppercase tracking-wider">Start</label>
                    <div className="flex gap-2">
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 border border-white/10 rounded-lg px-2.5 py-1.5 text-[13px] bg-[#0b101d] text-white outline-none [color-scheme:dark]" />
                      {!isAllDay && (
                        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-24 border border-white/10 rounded-lg px-2.5 py-1.5 text-[13px] bg-[#0b101d] text-white outline-none [color-scheme:dark]" />
                      )}
                    </div>
                  </div>

                  {/* End Details */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-white/40 font-bold uppercase tracking-wider">End</label>
                    <div className="flex gap-2">
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 border border-white/10 rounded-lg px-2.5 py-1.5 text-[13px] bg-[#0b101d] text-white outline-none [color-scheme:dark]" />
                      {!isAllDay && (
                        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-24 border border-white/10 rounded-lg px-2.5 py-1.5 text-[13px] bg-[#0b101d] text-white outline-none [color-scheme:dark]" />
                      )}
                    </div>
                  </div>

                  {/* Timezone and All day */}
                  <div className="space-y-3 sm:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-3.5 border-t border-white/5">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <label className="text-[11px] text-white/40 font-bold uppercase flex-shrink-0">Timezone</label>
                      <select value={timezone} onChange={e => setTimezone(e.target.value)} className="border border-white/10 rounded-lg px-2.5 py-1 text-[13px] bg-[#0b101d] text-white outline-none w-full sm:w-auto">
                        <option value="UTC">UTC (Universal Coordinated Time)</option>
                        <option value="Asia/Kolkata">IST (Indian Standard Time)</option>
                        <option value="America/New_York">EST (Eastern Standard Time)</option>
                        <option value="America/Chicago">CST (Central Standard Time)</option>
                        <option value="America/Denver">MST (Mountain Standard Time)</option>
                        <option value="America/Los_Angeles">PST (Pacific Standard Time)</option>
                        <option value="Europe/London">GMT (Greenwich Mean Time)</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-[13px] text-white/80 font-semibold cursor-pointer select-none self-start sm:self-auto">
                      <input 
                        type="checkbox" 
                        checked={isAllDay}
                        onChange={e => setIsAllDay(e.target.checked)}
                        className="rounded text-[#0057c7] focus:ring-[#0057c7]/50 w-4 h-4 border-white/10 bg-[#0b101d]"
                      />
                      All Day Event
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* ROW 4: Location Search */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-5 flex items-center justify-center text-white/30 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div className="flex-1">
                <input 
                  type="text" 
                  value={location} 
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Search for a location" 
                  className="w-full text-[13px] border-b border-white/10 bg-transparent py-1.5 focus:border-[#38bdf8] outline-none text-white placeholder:text-white/20 transition-all"
                />
              </div>
            </div>

            {/* Additional Links: Matter Links */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border-t border-white/5 pt-3.5">
              <div className="w-5 items-center justify-center text-white/30 flex-shrink-0 hidden sm:flex">
                <span>📁</span>
              </div>
              <div className="flex items-center gap-2 w-full">
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest flex-shrink-0">Related Case:</label>
                <select 
                  value={matterId} 
                  onChange={e => setMatterId(e.target.value)} 
                  className="border border-white/10 rounded-lg px-2.5 py-1.5 text-[13px] bg-[#0b101d] text-white outline-none w-full max-w-[320px]"
                >
                  <option value="">None (General Event)</option>
                  {matters.map(m => (
                    <option key={m.id} value={m.id}>{m.matter_number} - {m.title}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Description Editor Container */}
          <div className="border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden bg-[#0d1323] shadow-inner flex flex-col relative">
            
            {/* Mention Auto-complete Popup (Absolute inside container) */}
            {showMentionList && (
              <div className="absolute bottom-[60px] left-5 z-45 w-60 bg-[#121826] border border-white/10 rounded-xl shadow-2xl max-h-44 overflow-y-auto custom-scrollbar text-white">
                <div className="px-3 py-1.5 bg-white/5 text-[10px] font-bold text-white/40 uppercase border-b border-white/10">Mention Users</div>
                {getMentionMatches().map(u => (
                  <div
                    key={u.id}
                    onClick={() => selectMentionUser(u)}
                    className="px-3 py-2 hover:bg-white/5 cursor-pointer text-[13px] text-white font-semibold"
                  >
                    {u.full_name} <span className="text-white/40 font-normal">({u.email})</span>
                  </div>
                ))}
                {getMentionMatches().length === 0 && (
                  <div className="p-3 text-center text-white/40 italic text-[12px]">No matching users</div>
                )}
              </div>
            )}

            {/* Editable Description area */}
            <div 
              ref={editorRef}
              contentEditable 
              onKeyDown={handleEditorKeyDown}
              onPaste={handleEditorPaste}
              onInput={handleEditorInput}
              className="p-4 sm:p-5 min-h-[140px] sm:min-h-[160px] max-h-[240px] sm:max-h-[300px] overflow-y-auto text-[14px] text-white/90 outline-none custom-scrollbar focus:ring-1 focus:ring-[#38bdf8] bg-transparent custom-editor"
              placeholder="Description of the event..."
            />

            {/* Editor Toolbar */}
            <div className="bg-white/[0.02] border-t border-white/10 p-2 flex flex-col gap-1.5">
              
              {/* RTE Formatter ribbon */}
              <div className="px-3 py-1.5 bg-[#121826]/40 border border-white/5 rounded-xl overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-1">
                
                {/* Font Family selector */}
                <select 
                  onChange={(e) => execCommand('fontName', e.target.value)}
                  defaultValue="Arial"
                  className="bg-[#1a2233] border border-white/10 rounded-lg text-[11px] px-2 py-1 outline-none text-white max-w-[120px]"
                >
                  {fontFamilies.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                {/* Font Size selector */}
                <select 
                  onChange={(e) => {
                    const idx = fontSizes.indexOf(e.target.value) + 1;
                    execCommand('fontSize', idx);
                  }}
                  defaultValue="12px"
                  className="bg-[#1a2233] border border-white/10 rounded-lg text-[11px] px-2 py-1 outline-none text-white"
                >
                  {fontSizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <div className="h-4 w-px bg-white/10 mx-1 flex-shrink-0" />

                {/* Bold */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCommand('bold'); }}
                  className={`w-7 h-7 rounded flex items-center justify-center font-bold text-[13px] transition-colors ${isBold ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                >
                  B
                </button>

                {/* Italic */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCommand('italic'); }}
                  className={`w-7 h-7 rounded flex items-center justify-center italic font-serif text-[13px] transition-colors ${isItalic ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                >
                  I
                </button>

                {/* Underline */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCommand('underline'); }}
                  className={`w-7 h-7 rounded flex items-center justify-center underline text-[13px] transition-colors ${isUnderline ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                >
                  U
                </button>

                {/* Strikethrough */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCommand('strikeThrough'); }}
                  className={`w-7 h-7 rounded flex items-center justify-center line-through text-[13px] transition-colors ${isStrike ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                >
                  S
                </button>

                {/* Color pickers inputs */}
                <div className="relative group w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 cursor-pointer">
                  <span className="text-[12px] font-bold text-red-500">A</span>
                  <input 
                    type="color" 
                    onChange={e => execCommand('foreColor', e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>

                <div className="relative group w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 cursor-pointer">
                  <span className="text-[10px] bg-yellow-400 text-black px-0.5 rounded">H</span>
                  <input 
                    type="color" 
                    onChange={e => execCommand('hiliteColor', e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>

                <div className="h-4 w-px bg-white/10 mx-1 flex-shrink-0" />

                {/* Alignment Left */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCommand('justifyLeft'); }}
                  className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${alignState === 'left' ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M4 6h16M4 12h10M4 18h16" />
                  </svg>
                </button>

                {/* Center */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCommand('justifyCenter'); }}
                  className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${alignState === 'center' ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M4 6h16M6 12h12M4 18h16" />
                  </svg>
                </button>

                {/* Right */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCommand('justifyRight'); }}
                  className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${alignState === 'right' ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M4 6h16M10 12h10M4 18h16" />
                  </svg>
                </button>

                {/* Justify */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCommand('justifyFull'); }}
                  className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${alignState === 'justify' ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                <div className="h-4 w-px bg-white/10 mx-1 flex-shrink-0" />

                {/* Bullet List */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCommand('insertUnorderedList'); }}
                  className={`w-11 h-7 rounded flex items-center justify-center text-[11px] transition-colors ${isBullet ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                  title="• List"
                >
                  • List
                </button>

                {/* Numbered List */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCommand('insertOrderedList'); }}
                  className={`w-11 h-7 rounded flex items-center justify-center text-[11px] transition-colors ${isNumber ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                  title="1. List"
                >
                  1. List
                </button>

                {/* Outdent */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCommand('outdent'); }}
                  className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M11 17l-5-5 5-5M12 12h9M6 12h15" />
                  </svg>
                </button>

                {/* Indent */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCommand('indent'); }}
                  className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M13 5l5 5-5 5M18 12H9M6 12h12" />
                  </svg>
                </button>

                <div className="h-4 w-px bg-white/10 mx-1 flex-shrink-0" />

                {/* Inline Image */}
                <button 
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault();
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await uploadAndInsertImage(file);
                    };
                    input.click();
                  }}
                  className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
                  title="Insert Image"
                >
                  🖼️
                </button>

                {/* Emoji */}
                <button 
                  type="button"
                  onClick={e => openDropdown(e, setShowEmojiPopover)}
                  className="popover-trigger w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
                >
                  😀
                </button>

                {/* Quote Block */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); handleQuoteToggle(); }}
                  className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center font-bold text-[13px] text-white/80 hover:text-white"
                  title="Blockquote"
                >
                  “
                </button>

                {/* Horizontal Line */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCommand('insertHorizontalRule'); }}
                  className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center font-bold text-[13px] text-white/80 hover:text-white"
                  title="Horizontal Line"
                >
                  ―
                </button>

                <div className="h-4 w-px bg-white/10 mx-1 flex-shrink-0" />

                {/* Undo */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); handleUndo(); }}
                  className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
                >
                  ↶
                </button>

                {/* Redo */}
                <button 
                  type="button"
                  onMouseDown={e => { e.preventDefault(); handleRedo(); }}
                  className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
                >
                  ↷
                </button>
              </div>

              {/* Bottom bar inside editor toolbar */}
              <div className="flex items-center gap-2.5 pt-1.5 border-t border-white/10 text-white/60">
                {/* Attachment paperclip */}
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 hover:bg-white/5 rounded hover:text-white flex items-center gap-1 text-[12px] font-semibold"
                  title="Attach file (Up to 30 MB)"
                >
                  <span>📎</span>
                  Attach
                </button>
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef}
                  onChange={handleFileSelect} 
                  className="hidden" 
                />
              </div>
            </div>

          </div>

          {/* Attachments Display Section */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest block">Attachments ({attachments.length})</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-3 border border-white/5 bg-white/[0.02] rounded-xl text-[13px] text-white shadow-sm">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-[16px]">📎</span>
                      <div className="truncate">
                        <p className="font-semibold truncate text-white/90">{att.name}</p>
                        <p className="text-[10px] text-white/40">{(att.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <a 
                        href={`${API_BASE_URL.replace(/\/api$/, '')}/uploads/documents/${att.file_name}`} 
                        download={att.name}
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1.5 hover:bg-white/5 rounded text-[#38bdf8]"
                        title="Download file"
                      >
                        ↓
                      </a>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="p-1.5 hover:bg-white/5 rounded text-red-400"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadProgress !== null && (
            <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
              <div className="bg-[#38bdf8] h-full transition-all duration-100" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 bg-white/[0.01] flex items-center justify-end gap-3 flex-shrink-0">
          <button 
            onClick={onClose}
            className="px-5 py-1.5 border border-white/20 hover:bg-white/5 text-white/80 rounded-lg text-[13px] font-semibold transition-all active:scale-95"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="px-6 py-1.5 bg-[#0057c7] hover:bg-[#004bb1] text-white rounded-lg text-[13px] font-semibold shadow-md shadow-[#0057c7]/20 transition-all active:scale-95"
          >
            Save
          </button>
        </div>

      </div>

      {/* Floating fixed dropdown menus to prevent parent clipping */}
      {showRecurrencePopover && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
          className="z-[250] w-72 bg-[#121826] border border-white/10 rounded-xl shadow-xl p-4 text-[13px] space-y-3 text-white"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-semibold text-white/90">Recurrence Pattern</span>
            <button onClick={() => setShowRecurrencePopover(false)} className="text-white/40 hover:text-white">✕</button>
          </div>
          <div className="space-y-2">
            <label className="block font-medium text-white/70">Repeat option</label>
            <select value={recurrencePattern} onChange={e => setRecurrencePattern(e.target.value)} className="w-full border border-white/10 rounded px-2.5 py-1 text-[13px] bg-[#0b101d] text-white outline-none">
              <option value="none">Does Not Repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          {recurrencePattern !== 'none' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-white/50 font-semibold">Every</label>
                  <div className="flex items-center gap-1">
                    <input type="number" min="1" value={recurrenceInterval} onChange={e => setRecurrenceInterval(e.target.value)} className="w-14 border border-white/10 rounded px-1.5 py-0.5 text-center bg-[#0b101d]" />
                    <span>{recurrencePattern === 'daily' ? 'day(s)' : recurrencePattern === 'weekly' ? 'wk(s)' : recurrencePattern === 'monthly' ? 'mo(s)' : 'yr(s)'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-white/50 font-semibold">Ends</label>
                  <select value={recurrenceEndType} onChange={e => setRecurrenceEndType(e.target.value)} className="w-full border border-white/10 rounded px-1 py-0.5 bg-[#0b101d]">
                    <option value="never">Never</option>
                    <option value="count">After</option>
                    <option value="date">By Date</option>
                  </select>
                </div>
              </div>
              {recurrenceEndType === 'count' && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px]">Occurrences:</span>
                  <input type="number" min="1" value={recurrenceCount} onChange={e => setRecurrenceCount(e.target.value)} className="w-16 border border-white/10 rounded px-1.5 py-0.5 bg-[#0b101d]" />
                </div>
              )}
              {recurrenceEndType === 'date' && (
                <div>
                  <span className="text-[11px] text-white/50 font-semibold block">End Date</span>
                  <input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} className="border border-white/10 rounded px-2 py-0.5 w-full text-[12px] bg-[#0b101d] [color-scheme:dark]" />
                </div>
              )}
              {recurrencePattern === 'weekly' && (
                <div className="space-y-1">
                  <span className="text-[11px] text-white/50 font-semibold block">Repeat on</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                      <button
                        key={day}
                        onClick={() => {
                          if (recurrenceDays.includes(day)) {
                            setRecurrenceDays(prev => prev.filter(d => d !== day));
                          } else {
                            setRecurrenceDays(prev => [...prev, day]);
                          }
                        }}
                        className={`px-2 py-0.5 border rounded-full text-[11px] capitalize ${recurrenceDays.includes(day) ? 'bg-[#0057c7]/20 border-[#38bdf8] text-[#38bdf8]' : 'bg-white/5 border-white/10 text-white/60'}`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div className="pt-2 border-t border-white/10 flex justify-end">
            <button onClick={() => setShowRecurrencePopover(false)} className="px-3 py-1 bg-[#0057c7] text-white rounded-lg text-[12px] font-semibold">Done</button>
          </div>
        </div>
      )}

      {showBusyDropdown && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
          className="z-[250] w-44 bg-[#121826] border border-white/10 rounded-xl shadow-xl py-1 text-[13px]"
        >
          {['busy', 'free', 'tentative', 'oof', 'workingElsewhere'].map(status => (
            <button
              key={status}
              onClick={() => { setBusyStatus(status); setShowBusyDropdown(false); }}
              className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center gap-2 capitalize text-white"
            >
              <span className={`w-2 h-2 rounded-full ${status === 'free' ? 'bg-emerald-500' : status === 'tentative' ? 'bg-amber-400' : status === 'oof' ? 'bg-purple-500' : 'bg-red-500'}`} />
              {status === 'oof' ? 'Out of Office' : status === 'workingElsewhere' ? 'Working Elsewhere' : status}
            </button>
          ))}
        </div>
      )}

      {showReminderDropdown && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
          className="z-[250] w-48 bg-[#121826] border border-white/10 rounded-xl shadow-xl py-1 text-[13px]"
        >
          {[
            { value: 'none', label: 'No Reminder' },
            { value: '5_min', label: '5 minutes before' },
            { value: '10_min', label: '10 minutes before' },
            { value: '15_min', label: '15 minutes before' },
            { value: '30_min', label: '30 minutes before' },
            { value: '1_hour', label: '1 hour before' },
            { value: '1_day', label: '1 day before' },
            { value: 'custom', label: 'Custom date...' }
          ].map(r => (
            <button
              key={r.value}
              onClick={() => { setReminderOffset(r.value); if (r.value !== 'custom') setShowReminderDropdown(false); }}
              className="w-full text-left px-4 py-2 hover:bg-white/5 text-white"
            >
              {r.label}
            </button>
          ))}
          {reminderOffset === 'custom' && (
            <div className="p-3 border-t border-white/10 bg-[#0b101d]">
              <input 
                type="datetime-local" 
                value={customReminder} 
                onChange={e => setCustomReminder(e.target.value)} 
                className="border border-white/10 rounded px-2 py-1 text-[12px] w-full bg-[#121826] text-white [color-scheme:dark]"
              />
              <button 
                onClick={() => setShowReminderDropdown(false)} 
                className="mt-2 w-full py-1 bg-[#0057c7] text-white rounded text-[11px] font-semibold"
              >
                Confirm
              </button>
            </div>
          )}
        </div>
      )}

      {showCategoriesDropdown && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
          className="z-[250] w-48 bg-[#121826] border border-white/10 rounded-xl shadow-xl py-1 text-[13px]"
        >
          {availableCategories.map(cat => {
            const isChecked = selectedCategories.includes(cat.name);
            return (
              <label
                key={cat.name}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 cursor-pointer text-white"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </span>
                <input 
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    let nextCats;
                    if (isChecked) {
                      nextCats = selectedCategories.filter(c => c !== cat.name);
                    } else {
                      nextCats = [...selectedCategories, cat.name];
                    }
                    setSelectedCategories(nextCats);
                    setEventType(getEventTypeFromCategories(nextCats));
                  }}
                  className="w-3.5 h-3.5 rounded border-white/10 text-[#0057c7] bg-[#0b101d]"
                />
              </label>
            );
          })}
        </div>
      )}

      {showImportanceDropdown && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
          className="z-[250] w-36 bg-[#121826] border border-white/10 rounded-xl shadow-xl py-1 text-[13px]"
        >
          {[
            { value: 'high', label: 'High Importance', symbol: '!' },
            { value: 'normal', label: 'Normal Importance', symbol: '—' },
            { value: 'low', label: 'Low Importance', symbol: '↓' }
          ].map(item => (
            <button
              key={item.value}
              onClick={() => { setImportance(item.value); setShowImportanceDropdown(false); }}
              className="w-full text-left px-4 py-2 hover:bg-white/5 text-white flex items-center gap-2"
            >
              <span className="font-bold text-red-400">{item.symbol}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Floating Emoji Popover */}
      {showEmojiPopover && (
        <div 
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
          className="compose-popover w-64 bg-[#1a2233] border border-white/10 rounded-2xl shadow-xl p-3 z-[250] flex flex-wrap gap-2 max-h-[220px] overflow-y-auto custom-scrollbar justify-center"
        >
          {['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'].map(emoji => (
            <button 
              key={emoji}
              type="button"
              onClick={() => {
                if (editorRef.current) {
                  restoreSelection();
                  execCommand('insertHTML', emoji);
                }
                setShowEmojiPopover(false);
              }}
              className="w-7 h-7 text-[16px] hover:bg-white/10 rounded flex items-center justify-center transition-all active:scale-90 text-white"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
