import { useState, useEffect, useRef } from 'react';
import api, { API_BASE_URL } from '../../../services/api';
import { useToast } from '../../../components/UI.jsx';

export default function TitanComposeEmailModal({ isOpen, onClose, onSave, data = {}, user = {}, lookups = {}, accountId = null, titanAccounts = [] }) {
  const { toast } = useToast();
  const [activeAccountId, setActiveAccountId] = useState(accountId);

  useEffect(() => {
    if (isOpen) {
      setActiveAccountId(accountId);
    }
  }, [isOpen, accountId]);
  // Fields
  const [toEmails, setToEmails] = useState([]);
  const [ccEmails, setCcEmails] = useState([]);
  const [bccEmails, setBccEmails] = useState([]);
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  
  const [subject, setSubject] = useState('');

  // Toggles & states
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [trackOpens, setTrackOpens] = useState(false);
  const [requestReadReceipt, setRequestReadReceipt] = useState(false);
  const [sending, setSending] = useState(false);
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  // Dropdowns
  const [showTrackDropdown, setShowTrackDropdown] = useState(false);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [showInvoicesDropdown, setShowInvoicesDropdown] = useState(false);
  const [showSignatureDropdown, setShowSignatureDropdown] = useState(false);
  const [showEmojiPopover, setShowEmojiPopover] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // Data lists
  const [templates, setTemplates] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [signatureText, setSignatureText] = useState('');
  const [editSignatureMode, setEditSignatureMode] = useState(false);
  const [signatureInput, setSignatureInput] = useState('');

  // Editor Ref & History
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const typingTimeoutRef = useRef(null);
  const savedRangeRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  // Active toolbar states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrike, setIsStrike] = useState(false);
  const [isBullet, setIsBullet] = useState(false);
  const [isNumber, setIsNumber] = useState(false);
  const [alignState, setAlignState] = useState('left');

  // Attachments
  const [attachments, setAttachments] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Formatter lists
  const fontFamilies = ['Arial', 'Calibri', 'Times New Roman', 'Segoe UI', 'Courier New', 'Georgia', 'Verdana'];
  const fontSizes = ['10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px'];

  // Initialize
  useEffect(() => {
    if (isOpen) {
      // Load Templates and Invoices
      (async () => {
        try {
          const tRes = await api.templates.list({ limit: 100 });
          setTemplates(tRes.data || []);
        } catch (e) {
          console.error('Error fetching templates:', e);
        }
        try {
          const iRes = await api.billing.listInvoices({ limit: 100 });
          setInvoices((iRes.data || []).filter(inv => inv.status !== 'paid' && inv.status !== 'void'));
        } catch (e) {
          console.error('Error fetching invoices:', e);
        }
      })();

      // 1. Reset/Initialize form fields first
      setToEmails(data?.to ? (Array.isArray(data.to) ? data.to : [data.to]) : []);
      setCcEmails(data?.cc ? (Array.isArray(data.cc) ? data.cc : [data.cc]) : []);
      setBccEmails(data?.bcc ? (Array.isArray(data.bcc) ? data.bcc : [data.bcc]) : []);
      setSubject(data?.subject || '');
      setAttachments([]);
      setUploadProgress(null);
      setSending(false);

      // 2. User Signature Load
      let currentSignature = user?.signature || '';
      if (currentSignature && !currentSignature.includes('draggable')) {
        currentSignature = currentSignature.replace('<img ', '<img draggable="true" style="cursor: grab;" ');
      }
      setSignatureText(currentSignature);
      setSignatureInput(currentSignature);

      // 3. Auto-populate for replies/reply_all/forwards
      if (data?.mode && data?.originalEmail) {
        const og = data.originalEmail;
        const currentUser = JSON.parse(localStorage.getItem('vktori_user') || 'null');
        const currentUserEmail = (currentUser?.email || '').trim().toLowerCase();

        if (data.mode === 'reply') {
          setToEmails(og.sender?.email ? [og.sender.email] : []);
          setSubject(og.subject?.startsWith('Re:') ? og.subject : `Re: ${og.subject || ''}`);
          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.innerHTML = `<br/><br/>--- Original Message ---<br/>From: ${og.sender?.full_name || 'Sender'} &lt;${og.sender?.email || ''}&gt;<br/>Sent: ${new Date(og.created_at).toLocaleString()}<br/>To: ${og.to || ''}<br/>Subject: ${og.subject || ''}<br/><br/>${og.message_body}`;
            }
          }, 500);
        } else if (data.mode === 'reply_all') {
          const senderEmail = (og.sender?.email || '').trim().toLowerCase();
          const ogTo = (og.to || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
          const ogCc = (og.cc || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

          const toSet = new Set();
          if (senderEmail && senderEmail !== currentUserEmail) toSet.add(senderEmail);
          ogTo.forEach(e => {
            if (e !== currentUserEmail) toSet.add(e);
          });

          const ccSet = new Set();
          ogCc.forEach(e => {
            if (e !== currentUserEmail) ccSet.add(e);
          });

          setToEmails(Array.from(toSet));
          setCcEmails(Array.from(ccSet));
          setSubject(og.subject?.startsWith('Re:') ? og.subject : `Re: ${og.subject || ''}`);
          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.innerHTML = `<br/><br/>--- Original Message ---<br/>From: ${og.sender?.full_name || 'Sender'} &lt;${og.sender?.email || ''}&gt;<br/>Sent: ${new Date(og.created_at).toLocaleString()}<br/>To: ${og.to || ''}<br/>Subject: ${og.subject || ''}<br/><br/>${og.message_body}`;
            }
          }, 500);
        } else if (data.mode === 'forward') {
          setSubject(og.subject?.startsWith('Fwd:') ? og.subject : `Fwd: ${og.subject || ''}`);
          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.innerHTML = `<br/><br/>--- Forwarded Message ---<br/>From: ${og.sender?.full_name || 'Sender'} &lt;${og.sender?.email || ''}&gt;<br/>Sent: ${new Date(og.created_at).toLocaleString()}<br/>To: ${og.to || ''}<br/>Subject: ${og.subject || ''}<br/><br/>${og.message_body}`;
            }
          }, 500);
        }
      }

      // 4. Setup signature injection in editor
      setTimeout(() => {
        if (editorRef.current) {
          const defaultBody = data?.message || '<br/><br/><br/>';
          let bodyWithSignature = defaultBody;
          if (currentSignature) {
            bodyWithSignature = `${defaultBody}<br/>${currentSignature}<br/><br/><br/>`;
          }
          // Only apply defaultBody if NOT a reply/reply_all/forward (which already sets the HTML asynchronously)
          if (!data?.mode) {
            editorRef.current.innerHTML = bodyWithSignature;
          }
          historyRef.current = [editorRef.current.innerHTML];
          historyIndexRef.current = 0;
          restoreCursorAtEnd();
          updateToolbarActiveStates();
        }
      }, 200);
    }
  }, [isOpen, data, user?.signature]);

  // Click outside dropdown handler
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const clickedPopover = e.target.closest('.compose-popover') || e.target.closest('.popover-trigger');
      if (!clickedPopover) {
        setShowTrackDropdown(false);
        setShowTemplatesDropdown(false);
        setShowInvoicesDropdown(false);
        setShowSignatureDropdown(false);
        setShowEmojiPopover(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Auto-save draft
  const draftIdRef = useRef(data?.id || null);
  useEffect(() => {
    if (!isOpen || sending) return;
    
    const interval = setInterval(async () => {
      const finalBodyText = editorRef.current?.innerHTML || '';
      if (!toEmails.length && !subject && !finalBodyText.replace(/<[^>]*>?/gm, '').trim()) return; 
      
      const payload = {
        id: draftIdRef.current,
        accountId: activeAccountId,
        subject,
        message_body: finalBodyText,
        to: toEmails,
        cc: ccEmails,
        bcc: bccEmails,
      };

      try {
        const res = await api.request('/titan-email/draft', { method: 'POST', body: payload });
        if (res.data?.data?.id) {
          draftIdRef.current = res.data.data.id;
        }
      } catch (err) {
        console.error('Auto-save draft failed', err);
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [isOpen, sending, toEmails, ccEmails, bccEmails, subject, activeAccountId]);

  // Handle Selection updates
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // Make sure the range starts or ends inside the editor container
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

  const updateToolbarActiveStates = () => {
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

  // Monitor selection change globally
  useEffect(() => {
    document.addEventListener('selectionchange', handleEditorSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleEditorSelectionChange);
    };
  }, []);

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

  // Document formatting executor
  const execCommand = (command, value = null) => {
    restoreSelection();

    const wordLevelCommands = ['bold', 'italic', 'underline', 'strikeThrough', 'foreColor', 'hiliteColor', 'fontName', 'fontSize'];
    const sel = window.getSelection();
    if (sel && sel.isCollapsed && wordLevelCommands.includes(command)) {
      expandSelectionToWord(sel);
    }

    document.execCommand(command, false, value);
    saveStateToHistory(editorRef.current?.innerHTML || '');
    updateToolbarActiveStates();
  };

  // Keyboard undo/redo history managers
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
      
      // Save cursor position immediately
      savedRangeRef.current = range;
    }
  };

  const handleEditorKeyDown = (e) => {
    // Keyboard format shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        execCommand('bold');
        return;
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        execCommand('italic');
        return;
      }
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        execCommand('underline');
        return;
      }
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        handleRedo();
        return;
      }
    }
    
    // Normal typing debounce history saves
    if (e.key === ' ' || e.key === 'Enter') {
      saveStateToHistory(editorRef.current?.innerHTML || '');
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        saveStateToHistory(editorRef.current?.innerHTML || '');
      }, 800);
    }
  };

  // Selection quote wrap checker
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

  // Dropdown offset calculators
  const openDropdown = (e, setter) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY,
      left: Math.min(rect.left + window.scrollX, window.innerWidth - 320)
    });
    
    // Close others
    setShowTrackDropdown(false);
    setShowTemplatesDropdown(false);
    setShowInvoicesDropdown(false);
    setShowSignatureDropdown(false);
    setShowEmojiPopover(false);
    
    setter(true);
  };

  // Multi-email Chip actions
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailAdd = (inputVal, list, setList, setInput) => {
    const emails = inputVal.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    const valid = [];
    const invalid = [];

    emails.forEach(e => {
      if (validateEmail(e)) {
        if (!list.includes(e)) valid.push(e);
      } else {
        invalid.push(e);
      }
    });

    if (valid.length > 0) {
      setList(prev => [...prev, ...valid]);
      setInput('');
    }
    if (invalid.length > 0) {
      toast(`Invalid email format: ${invalid.join(', ')}`, 'error');
    }
  };

  const handleEmailKeyDown = (e, inputVal, list, setList, setInput) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleEmailAdd(inputVal, list, setList, setInput);
    } else if (e.key === 'Backspace' && !inputVal && list.length > 0) {
      setList(prev => prev.slice(0, -1));
    }
  };

  // Invoices & templates insertion
  const handleInsertTemplate = (t) => {
    if (editorRef.current) {
      restoreSelection();
      
      const contentToInsert = t.content || t.body || '';
      
      // Check if signature block already exists in editor
      const sigBlock = editorRef.current.querySelector('.email-signature-block');
      if (sigBlock) {
        // Create wrapper for the template content before signature
        const wrapper = document.createElement('div');
        wrapper.className = 'email-template-inserted';
        wrapper.innerHTML = contentToInsert;
        editorRef.current.insertBefore(wrapper, sigBlock);
      } else {
        // Insert inline html
        execCommand('insertHTML', `<div class="email-template-inserted">${contentToInsert}</div>`);
      }
      
      saveStateToHistory(editorRef.current.innerHTML);
      setShowTemplatesDropdown(false);
      toast(`Applied template: ${t.title}`, 'success');
    }
  };

  const handleInsertInvoice = (inv) => {
    if (editorRef.current) {
      restoreSelection();
      const invoiceLink = `<a href="/billing/invoices/${inv.id}" style="color: #38bdf8; text-decoration: underline; font-weight: 700;">Invoice #${inv.invoice_number} (Outstanding: $${inv.due_amount})</a>`;
      execCommand('insertHTML', invoiceLink);
      setShowInvoicesDropdown(false);
      toast(`Inserted link to Invoice #${inv.invoice_number}`, 'success');
    }
  };

  // Canvas drawing mouse/touch handlers
  const startDrawing = (e) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    isDrawingRef.current = true;
    lastX.current = clientX - rect.left;
    lastY.current = clientY - rect.top;
  };

  const draw = (e) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastX.current, lastY.current);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    lastX.current = currentX;
    lastY.current = currentY;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleClearSignature = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Set up canvas options
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#38bdf8';
    }
  }, [editSignatureMode, showSignatureDropdown]);

  // Signatures profile operations
  const handleSaveSignature = async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const base64 = canvas.toDataURL('image/png');
    const signatureHtml = `<img src="${base64}" alt="Digital Signature" draggable="true" style="max-height: 50px; vertical-align: middle; display: inline-block; cursor: grab;" />`;

    try {
      const res = await api.request('/auth/signature', {
        method: 'PUT',
        body: { signature: signatureHtml }
      });
      if (res.success) {
        setSignatureText(signatureHtml);
        setEditSignatureMode(false);
        toast('Digital signature saved to profile successfully!', 'success');
        
        // Update signature block inside editor if present
        if (editorRef.current) {
          const existingSig = editorRef.current.querySelector('img[alt="Digital Signature"]');
          if (existingSig) {
            existingSig.outerHTML = signatureHtml;
            saveStateToHistory(editorRef.current.innerHTML);
          }
        }
      } else {
        toast('Failed to save signature', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Failed to save signature in database', 'error');
    }
  };

  const handleInsertSignatureAtCursor = () => {
    if (editorRef.current) {
      restoreSelection();
      
      const existingSig = editorRef.current.querySelector('img[alt="Digital Signature"]');
      if (existingSig) {
        existingSig.outerHTML = signatureText;
        toast('Signature updated inside editor', 'success');
      } else {
        execCommand('insertHTML', `&nbsp;${signatureText}&nbsp;`);
        toast('Signature inserted', 'success');
      }
      setShowSignatureDropdown(false);
    }
  };

  const handleRemoveSignatureFromEditor = () => {
    if (editorRef.current) {
      const existingSig = editorRef.current.querySelector('img[alt="Digital Signature"]');
      if (existingSig) {
        existingSig.remove();
        saveStateToHistory(editorRef.current.innerHTML);
        toast('Signature removed from email body', 'success');
      } else {
        toast('No signature block found in the email body.', 'warning');
      }
      setShowSignatureDropdown(false);
    }
  };

  // Image pasting & uploads (Multer 30MB check)
  const uploadImageBlob = async (blob) => {
    const formData = new FormData();
    formData.append('files', blob, `inline_image_${Date.now()}.png`);
    
    const isActivity = String(matterId).startsWith('act_');
    const parsedMatterId = isActivity ? null : (matterId ? parseInt(String(matterId), 10) : null);
    const parsedActivityId = isActivity ? parseInt(String(matterId).replace('act_', ''), 10) : null;

    const metadata = [{
      matter_id: parsedMatterId,
      activity_id: parsedActivityId,
      category: 'Email Attachment',
      visibility: visibility === 'Shared' ? 'client_shared' : 'internal',
      uploaded_by_user_id: String(user.id),
    }];
    formData.append('metadata', JSON.stringify(metadata));

    try {
      const res = await api.documents.createBulk(formData);
      const doc = res.data?.[0]?.document;
      if (doc?.id) {
        return `/uploads/documents/${doc.file_name}`;
      }
    } catch (e) {
      console.error('Image upload failed:', e);
      toast('Could not upload inline image', 'error');
    }
    return null;
  };

  const handleEditorPaste = async (e) => {
    const items = e.clipboardData?.items || [];
    let imageFound = false;
    for (const item of items) {
      if (item.type.includes('image')) {
        e.preventDefault();
        imageFound = true;
        const blob = item.getAsFile();
        if (blob.size > 30 * 1024 * 1024) {
          toast('Inline images cannot exceed the 30 MB size limit.', 'error');
          return;
        }
        toast('Uploading inline image...', 'info');
        const url = await uploadImageBlob(blob);
        if (url) {
          const staticUrl = `${API_BASE_URL.replace('/api', '')}${url}`;
          const imgHtml = `<img src="${staticUrl}" alt="Inline image" style="max-width: 100%; height: auto; display: block; margin: 10px 0; border-radius: 8px;" />`;
          execCommand('insertHTML', imgHtml);
          toast('Inline image uploaded and embedded.', 'success');
        }
      }
    }
  };

  // Drag and drop attachment file handler
  const handleFileUpload = async (filesList) => {
    const validFiles = [];
    const oversized = [];

    for (const file of filesList) {
      if (file.size > 30 * 1024 * 1024) {
        oversized.push(file.name);
      } else {
        validFiles.push(file);
      }
    }

    if (oversized.length > 0) {
      toast(`Oversized files rejected (> 30 MB): ${oversized.join(', ')}`, 'error');
    }
    if (validFiles.length === 0) return;

    // Build form data
    const formData = new FormData();
    const metadataList = [];
    const isActivity = String(matterId).startsWith('act_');
    const parsedMatterId = isActivity ? null : (matterId ? parseInt(String(matterId), 10) : null);
    const parsedActivityId = isActivity ? parseInt(String(matterId).replace('act_', ''), 10) : null;

    for (const file of validFiles) {
      formData.append('files', file);
      metadataList.push({
        matter_id: parsedMatterId,
        activity_id: parsedActivityId,
        category: 'Email Attachment',
        visibility: visibility === 'Shared' ? 'client_shared' : 'internal',
        uploaded_by_user_id: String(user.id),
      });
    }
    formData.append('metadata', JSON.stringify(metadataList));

    setUploadProgress(10);
    try {
      const res = await api.documents.createBulk(formData);
      const results = res.data || [];
      const successes = results.filter(r => r.status === 'success').map(r => r.document);
      
      if (successes.length > 0) {
        setAttachments(prev => [...prev, ...successes]);
        toast(`Attached ${successes.length} files.`, 'success');
      }
      const failures = results.length - successes.length;
      if (failures > 0) {
        toast(`Upload failed for ${failures} attachments.`, 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Upload failed.', 'error');
    } finally {
      setUploadProgress(null);
    }
  };

  const handleDragOver = (e) => {
    const types = Array.from(e.dataTransfer?.types || []);
    if (!types.includes('text/html')) {
      e.preventDefault();
    }
  };

  const handleFileDrop = (e) => {
    const types = Array.from(e.dataTransfer?.types || []);
    if (types.includes('text/html')) {
      return; 
    }
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // Click handler to open/download attachments
  const handleAttachmentPreview = (file) => {
    const staticDocUrl = `${API_BASE_URL.replace('/api', '')}/uploads/documents/${file.file_name}`;
    window.open(staticDocUrl, '_blank');
  };

  // Discard check
  const handleDiscardClick = () => {
    const initialText = data?.message || '<br/><br/><br/>';
    let sigWithDraggable = user?.signature || '';
    if (sigWithDraggable && !sigWithDraggable.includes('draggable')) {
      sigWithDraggable = sigWithDraggable.replace('<img ', '<img draggable="true" style="cursor: grab;" ');
    }
    const initialSig = user?.signature ? `<br/>${sigWithDraggable}<br/><br/><br/>` : '';
    const initialBody = `${initialText}${initialSig}`;
    
    const isModified = 
      toEmails.length > 0 || 
      ccEmails.length > 0 || 
      bccEmails.length > 0 || 
      subject.trim() !== '' || 
      (editorRef.current && editorRef.current.innerHTML !== initialBody && editorRef.current.innerHTML !== '');

    if (isModified) {
      setShowConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  // Compose send email triggers
  const handleSendEmail = async () => {
    if (toEmails.length === 0) {
      toast('Please enter at least one recipient in the To field.', 'error');
      return;
    }
    if (!subject.trim()) {
      toast('Please enter a subject.', 'error');
      return;
    }

    setSending(true);

    // Build message body content
    let emailHtml = editorRef.current?.innerHTML || '';
    
    // Format attachments references inside message log body
    let finalBodyText = emailHtml;
    if (attachments.length > 0) {
      finalBodyText += '\n\nAttachments:';
      attachments.forEach(doc => {
        finalBodyText += `\n[attachment:${doc.id}:${doc.original_name || doc.file_name}]`;
      });
    }

    const payload = {
      subject,
      message_body: finalBodyText,
      to: toEmails,
      cc: ccEmails,
      bcc: bccEmails,
      track_opens: trackOpens,
      request_read_receipt: requestReadReceipt,
      reply_to_id: (data?.mode === 'reply' || data?.mode === 'reply_all') ? data.originalEmail?.id : null
    };

    try {
      const isEdit = !!data?.id;
      let res;
      if (isEdit) {
        res = await api.request('/titan-email/send', { method: 'POST', body: { accountId: activeAccountId, ...payload, id: data.id } });
      } else {
        res = await api.request('/titan-email/send', { method: 'POST', body: { accountId: activeAccountId, ...payload } });
      }

      if (res.success || res.data) {
        toast(isEdit ? 'Email log updated successfully.' : 'Email sent and logged successfully.', 'success');
        if (onSave) onSave();
        onClose();
      } else {
        toast(isEdit ? 'Failed to update email log.' : 'Failed to log email communication.', 'error');
      }
    } catch (e) {
      console.error('Email create failure:', e);
      toast('Error sending email log.', 'error');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onDragOver={handleDragOver}
      onDrop={handleFileDrop}
    >
      {/* Compose window popup */}
      <div className="bg-[#0b101d] w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-[850px] sm:rounded-3xl border border-white/10 flex flex-col overflow-hidden text-white shadow-2xl font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#121826] border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
            <h2 className="text-[15px] font-800 tracking-tight text-white uppercase tracking-widest">New Email</h2>
          </div>
          <button 
            disabled={sending}
            onClick={handleDiscardClick} 
            className={`w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Command Ribbon */}
        <div className="px-4 py-2.5 bg-[#121826]/60 border-b border-white/5 flex flex-wrap items-center gap-1">
          <button 
            disabled={sending}
            onClick={handleSendEmail}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-700 transition-all shadow-md shadow-blue-600/10 ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {sending ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
            {sending ? (data?.id ? 'Updating...' : 'Sending...') : (data?.id ? 'Update' : 'Send')}
          </button>
          
          <button 
            disabled={sending}
            onClick={handleDiscardClick}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-white/80 hover:text-white text-[12px] font-600 transition-all ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Discard
          </button>

          <div className="h-4 w-px bg-white/10 mx-2" />

          {/* Attach files link */}
          <button 
            disabled={sending}
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-white/80 hover:text-white text-[12px] font-600 transition-all ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 0A3 3 0 1010.607 13.3m3.535-3.536L9.65 14.243m0 0a3.75 3.75 0 11-5.303-5.304l7.682-7.682a5.625 5.625 0 017.955 7.955l-7.682 7.682a1.875 1.875 0 11-2.652-2.652L17 7" />
            </svg>
            Attach File
          </button>

          {/* Templates dropdown */}
          <button 
            disabled={sending}
            onClick={(e) => openDropdown(e, setShowTemplatesDropdown)}
            className={`popover-trigger flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-white/80 hover:text-white text-[12px] font-600 transition-all ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Templates
          </button>

          {/* Invoices dropdown */}
          <button 
            disabled={sending}
            onClick={(e) => openDropdown(e, setShowInvoicesDropdown)}
            className={`popover-trigger flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-white/80 hover:text-white text-[12px] font-600 transition-all ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Invoices
          </button>

          {/* Signature dropdown */}
          <button 
            disabled={sending}
            onClick={(e) => openDropdown(e, setShowSignatureDropdown)}
            className={`popover-trigger flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-white/80 hover:text-white text-[12px] font-600 transition-all ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Signature
          </button>
        </div>

        {/* Input fields */}
        <div className="p-3 sm:p-4 bg-[#121826]/20 border-b border-white/5 flex flex-col gap-2.5 max-h-[160px] sm:max-h-[300px] overflow-y-auto">
          
          {/* From field */}
          <div className="flex flex-col sm:flex-row sm:items-center text-[13px] border-b border-white/5 pb-2">
            <span className="w-20 text-white/40 font-800 uppercase tracking-wider text-[11px] mb-1 sm:mb-0">From</span>
            {titanAccounts && titanAccounts.length > 1 ? (
              <div className="relative inline-block">
                <select
                  disabled={sending}
                  value={activeAccountId || ''}
                  onChange={(e) => setActiveAccountId(parseInt(e.target.value, 10))}
                  className="bg-[#1c2436] border border-white/10 rounded-lg px-2.5 py-1 text-[12px] text-white font-600 focus:outline-none focus:border-blue-500 cursor-pointer appearance-none pr-8"
                >
                  {titanAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.email_address}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-white/40">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6 9l6 6 6-6" /></svg>
                </div>
              </div>
            ) : (
              <span className="text-white/80 font-600 select-all">
                {titanAccounts.find(acc => acc.id === activeAccountId)?.email_address || user?.email || 'my-profile@firm.com'}
              </span>
            )}
          </div>

          {/* To field */}
          <div className="flex flex-col sm:flex-row sm:items-start text-[13px] border-b border-white/5 pb-1 gap-1.5 sm:gap-0">
            <div className="flex items-center justify-between w-full sm:w-20 flex-shrink-0">
              <span className="text-white/40 font-800 uppercase tracking-wider text-[11px]">To</span>
              <div className="flex items-center gap-2 sm:hidden">
                <button type="button" onClick={() => setShowCc(p => !p)} className="text-[11px] font-800 text-blue-400 uppercase tracking-wider">Cc</button>
                <button type="button" onClick={() => setShowBcc(p => !p)} className="text-[11px] font-800 text-blue-400 uppercase tracking-wider">Bcc</button>
              </div>
            </div>
            <div className="flex-1 flex flex-wrap items-center gap-1.5 w-full">
              {toEmails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-[#1c2436] border border-white/10 px-2 py-0.5 rounded-lg text-[12px] text-white animate-fade-in">
                  <span>{email}</span>
                  <button disabled={sending} type="button" onClick={() => setToEmails(prev => prev.filter((_, i) => i !== idx))} className="text-white/40 hover:text-white">×</button>
                </div>
              ))}
              <input 
                disabled={sending}
                type="text" 
                value={toInput}
                onChange={e => setToInput(e.target.value)}
                onBlur={() => handleEmailAdd(toInput, toEmails, setToEmails, setToInput)}
                onKeyDown={e => handleEmailKeyDown(e, toInput, toEmails, setToEmails, setToInput)}
                placeholder={toEmails.length === 0 ? "recipient@example.com" : ""}
                className="bg-transparent border-none outline-none flex-1 min-w-[120px] py-1 text-white placeholder:text-white/30 w-full"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2 ml-2 mt-1 flex-shrink-0">
              <button 
                type="button" 
                onClick={() => setShowCc(p => !p)}
                className="text-[11px] font-800 text-blue-400 hover:text-blue-300 uppercase tracking-wider"
              >
                Cc
              </button>
              <button 
                type="button" 
                onClick={() => setShowBcc(p => !p)}
                className="text-[11px] font-800 text-blue-400 hover:text-blue-300 uppercase tracking-wider"
              >
                Bcc
              </button>
            </div>
          </div>

          {/* Cc field */}
          {showCc && (
            <div className="flex flex-col sm:flex-row sm:items-start text-[13px] border-b border-white/5 pb-1 gap-1.5 sm:gap-0 animate-fade-in">
              <span className="w-20 text-white/40 font-800 uppercase tracking-wider text-[11px] mb-1 sm:mb-0 sm:mt-2">Cc</span>
              <div className="flex-1 flex flex-wrap items-center gap-1.5 w-full">
                {ccEmails.map((email, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-[#1c2436] border border-white/10 px-2 py-0.5 rounded-lg text-[12px] text-white">
                    <span>{email}</span>
                    <button disabled={sending} type="button" onClick={() => setCcEmails(prev => prev.filter((_, i) => i !== idx))} className="text-white/40 hover:text-white">×</button>
                  </div>
                ))}
                <input 
                  disabled={sending}
                  type="text" 
                  value={ccInput}
                  onChange={e => setCcInput(e.target.value)}
                  onBlur={() => handleEmailAdd(ccInput, ccEmails, setCcEmails, setCcInput)}
                  onKeyDown={e => handleEmailKeyDown(e, ccInput, ccEmails, setCcEmails, setCcInput)}
                  placeholder="Add cc recipient..."
                  className="bg-transparent border-none outline-none flex-1 min-w-[120px] py-1 text-white placeholder:text-white/30 w-full"
                />
              </div>
            </div>
          )}

          {/* Bcc field */}
          {showBcc && (
            <div className="flex flex-col sm:flex-row sm:items-start text-[13px] border-b border-white/5 pb-1 gap-1.5 sm:gap-0 animate-fade-in">
              <span className="w-20 text-white/40 font-800 uppercase tracking-wider text-[11px] mb-1 sm:mb-0 sm:mt-2">Bcc</span>
              <div className="flex-1 flex flex-wrap items-center gap-1.5 w-full">
                {bccEmails.map((email, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-[#1c2436] border border-white/10 px-2 py-0.5 rounded-lg text-[12px] text-white">
                    <span>{email}</span>
                    <button disabled={sending} type="button" onClick={() => setBccEmails(prev => prev.filter((_, i) => i !== idx))} className="text-white/40 hover:text-white">×</button>
                  </div>
                ))}
                <input 
                  disabled={sending}
                  type="text" 
                  value={bccInput}
                  onChange={e => setBccInput(e.target.value)}
                  onBlur={() => handleEmailAdd(bccInput, bccEmails, setBccEmails, setBccInput)}
                  onKeyDown={e => handleEmailKeyDown(e, bccInput, bccEmails, setBccEmails, setBccInput)}
                  placeholder="Add bcc recipient..."
                  className="bg-transparent border-none outline-none flex-1 min-w-[120px] py-1 text-white placeholder:text-white/30 w-full"
                />
              </div>
            </div>
          )}

          {/* Subject field */}
          <div className="flex flex-col sm:flex-row sm:items-center text-[13px] border-b border-white/5 pb-1">
            <span className="w-20 text-white/40 font-800 uppercase tracking-wider text-[11px] mb-1 sm:mb-0">Subject</span>
            <input 
              disabled={sending}
              type="text" 
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="bg-transparent border-none outline-none flex-1 py-1 text-white placeholder:text-white/30 w-full"
            />
          </div>

        </div>

        {/* RTE Formatter ribbon */}
        <div className="px-4 py-2 bg-[#121826]/40 border-b border-white/5 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-1">
          
          {/* Font Family selector */}
          <select 
            disabled={sending}
            onChange={(e) => execCommand('fontName', e.target.value)}
            defaultValue="Arial"
            className="bg-[#1a2233] border border-white/10 rounded-lg text-[11px] px-2 py-1 outline-none text-white max-w-[120px]"
          >
            {fontFamilies.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          {/* Font Size selector */}
          <select 
            disabled={sending}
            onChange={(e) => {
              const idx = fontSizes.indexOf(e.target.value) + 1;
              execCommand('fontSize', idx);
            }}
            defaultValue="12px"
            className="bg-[#1a2233] border border-white/10 rounded-lg text-[11px] px-2 py-1 outline-none text-white"
          >
            {fontSizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <div className="h-4 w-px bg-white/10 mx-1" />

          {/* Bold */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); execCommand('bold'); }}
            className={`w-7 h-7 rounded flex items-center justify-center font-bold text-[13px] transition-colors ${isBold ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
          >
            B
          </button>

          {/* Italic */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); execCommand('italic'); }}
            className={`w-7 h-7 rounded flex items-center justify-center italic font-serif text-[13px] transition-colors ${isItalic ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
          >
            I
          </button>

          {/* Underline */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); execCommand('underline'); }}
            className={`w-7 h-7 rounded flex items-center justify-center underline text-[13px] transition-colors ${isUnderline ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
          >
            U
          </button>

          {/* Strikethrough */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); execCommand('strikeThrough'); }}
            className={`w-7 h-7 rounded flex items-center justify-center line-through text-[13px] transition-colors ${isStrike ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
          >
            S
          </button>

          {/* Color pickers inputs */}
          <div className="relative group w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 cursor-pointer">
            <span className="text-[12px] font-bold text-red-500">A</span>
            <input 
              disabled={sending}
              type="color" 
              onChange={e => execCommand('foreColor', e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>

          <div className="relative group w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 cursor-pointer">
            <span className="text-[10px] bg-yellow-400 text-black px-0.5 rounded">H</span>
            <input 
              disabled={sending}
              type="color" 
              onChange={e => execCommand('hiliteColor', e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>

          <div className="h-4 w-px bg-white/10 mx-1" />

          {/* Alignment Left */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); execCommand('justifyLeft'); }}
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${alignState === 'left' ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M4 6h16M4 12h10M4 18h16" />
            </svg>
          </button>

          {/* Center */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); execCommand('justifyCenter'); }}
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${alignState === 'center' ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M4 6h16M6 12h12M4 18h16" />
            </svg>
          </button>

          {/* Right */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); execCommand('justifyRight'); }}
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${alignState === 'right' ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M4 6h16M10 12h10M4 18h16" />
            </svg>
          </button>

          {/* Justify */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); execCommand('justifyFull'); }}
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${alignState === 'justify' ? 'bg-blue-600/30 text-blue-400' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          {/* Bullet List */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); execCommand('insertUnorderedList'); }}
            className={`w-11 h-7 rounded flex items-center justify-center text-[11px] transition-colors ${isBullet ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            title="• List"
          >
            • List
          </button>

          {/* Numbered List */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); execCommand('insertOrderedList'); }}
            className={`w-11 h-7 rounded flex items-center justify-center text-[11px] transition-colors ${isNumber ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            title="1. List"
          >
            1. List
          </button>

          {/* Outdent */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); execCommand('outdent'); }}
            className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M11 17l-5-5 5-5M12 12h9M6 12h15" />
            </svg>
          </button>

          {/* Indent */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); execCommand('indent'); }}
            className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M13 5l5 5-5 5M18 12H9M6 12h12" />
            </svg>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          {/* Inline Image */}
          <button 
            disabled={sending}
            onMouseDown={e => {
              e.preventDefault();
              imageInputRef.current?.click();
            }}
            className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
            title="Insert Image"
          >
            🖼️
          </button>

          {/* Emoji */}
          <button 
            disabled={sending}
            onClick={e => openDropdown(e, setShowEmojiPopover)}
            className="popover-trigger w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
          >
            😀
          </button>

          {/* Quote Block */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); handleQuoteToggle(); }}
            className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center font-bold text-[13px] text-white/80 hover:text-white"
            title="Blockquote"
          >
            “
          </button>

          {/* Horizontal Line */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); execCommand('insertHorizontalRule'); }}
            className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center font-bold text-[13px] text-white/80 hover:text-white"
            title="Horizontal Line"
          >
            ―
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          {/* Undo */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); handleUndo(); }}
            className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
          >
            ↶
          </button>

          {/* Redo */}
          <button 
            disabled={sending}
            onMouseDown={e => { e.preventDefault(); handleRedo(); }}
            className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
          >
            ↷
          </button>
        </div>

        {/* Contenteditable Rich Text Editor */}
        <div className="flex-1 min-h-[150px] sm:min-h-[250px] overflow-y-auto p-4 sm:p-6 bg-[#090d16] text-white relative border-b border-white/5">
          <div 
            ref={editorRef}
            contentEditable={!sending}
            onKeyDown={handleEditorKeyDown}
            onPaste={handleEditorPaste}
            onDragStart={() => { window.__isEditorDragging = true; }}
            onDragEnd={() => { window.__isEditorDragging = false; }}
            onDragOver={(e) => { if (window.__isEditorDragging) e.stopPropagation(); }}
            onDrop={(e) => { if (window.__isEditorDragging) e.stopPropagation(); }}
            className="w-full h-full min-h-[200px] outline-none text-[14px] leading-relaxed custom-editor"
            placeholder="Write your email here..."
          />
          
          {/* File attachment upload overlays */}
          {uploadProgress !== null && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              <div className="text-[12px] font-700 text-blue-400">Uploading attachments ({uploadProgress}%) ...</div>
            </div>
          )}
        </div>

        {/* Selected files attachment pills list */}
        {attachments.length > 0 && (
          <div className="px-6 py-3 bg-[#121826]/40 border-b border-white/5 max-h-[110px] overflow-y-auto custom-scrollbar flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-[#1c2436] border border-white/10 px-3 py-1 rounded-xl text-[11px] text-white">
                <button 
                  type="button"
                  onClick={() => handleAttachmentPreview(file)}
                  className="hover:underline text-left truncate max-w-[200px] font-600 text-blue-400 hover:text-blue-300"
                >
                  📄 {file.original_name || file.file_name}
                </button>
                <span className="text-white/40">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                <button 
                  disabled={sending}
                  type="button" 
                  onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} 
                  className="text-red-400 hover:text-red-300 text-[12px] ml-1 font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer info bar */}
        <div className="px-6 py-3 bg-[#121826] flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between items-center text-center sm:text-left text-[11px] text-slate-400 border-t border-white/5">
          <span>Supported attachments limit: 30 MB</span>
          <div className="flex items-center gap-4">
            {trackOpens && <span className="flex items-center gap-1 text-emerald-400">✓ Open Tracking Enabled</span>}
            {requestReadReceipt && <span className="flex items-center gap-1 text-emerald-400">✓ Read Receipt Requested</span>}
          </div>
        </div>

      </div>

      {/* Hidden file input handlers */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        multiple 
        onChange={e => handleFileUpload(Array.from(e.target.files || []))} 
      />
      <input 
        type="file" 
        ref={imageInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={async e => {
          const file = e.target.files?.[0];
          if (file) {
            if (file.size > 30 * 1024 * 1024) {
              toast('Inline images cannot exceed 30 MB.', 'error');
              return;
            }
            toast('Uploading inline image...', 'info');
            const url = await uploadImageBlob(file);
            if (url) {
              const staticUrl = `${API_BASE_URL.replace('/api', '')}${url}`;
              const imgHtml = `<img src="${staticUrl}" alt="Inserted image" style="max-width: 100%; height: auto; display: block; margin: 10px 0; border-radius: 8px;" />`;
              execCommand('insertHTML', imgHtml);
              toast('Inline image uploaded and embedded.', 'success');
            }
          }
        }} 
      />

      {/* Fixed Dropdown Popovers */}
      
      {/* 1. Track Popover */}
      {showTrackDropdown && (
        <div 
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
          className="compose-popover w-64 bg-[#1a2233] border border-white/10 rounded-2xl shadow-xl p-4 z-[200] flex flex-col gap-3"
        >
          <div className="text-[12px] font-800 uppercase tracking-widest text-slate-400 pb-1 border-b border-white/5">Track Settings</div>
          <label className="flex items-center gap-3 cursor-pointer text-[13px] hover:text-blue-400 transition-colors">
            <input 
              type="checkbox" 
              checked={trackOpens} 
              onChange={e => setTrackOpens(e.target.checked)} 
              className="w-4 h-4 rounded accent-blue-600 bg-white/5 border-white/10"
            />
            <span>Track Email Opens</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer text-[13px] hover:text-blue-400 transition-colors">
            <input 
              type="checkbox" 
              checked={requestReadReceipt} 
              onChange={e => setRequestReadReceipt(e.target.checked)} 
              className="w-4 h-4 rounded accent-blue-600 bg-white/5 border-white/10"
            />
            <span>Request Read Receipt</span>
          </label>
          <button 
            onClick={() => setShowTrackDropdown(false)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-700 py-1.5 rounded-xl mt-1 transition-all"
          >
            Apply
          </button>
        </div>
      )}

      {/* 2. Templates Popover */}
      {showTemplatesDropdown && (
        <div 
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
          className="compose-popover w-72 bg-[#1a2233] border border-white/10 rounded-2xl shadow-xl z-[200] flex flex-col max-h-[300px]"
        >
          <div className="p-3 text-[12px] font-800 uppercase tracking-widest text-slate-400 border-b border-white/5">Select template</div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
            {templates.length === 0 ? (
              <div className="text-[12px] text-slate-500 p-4 text-center">No email templates found.</div>
            ) : (
              templates.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => handleInsertTemplate(t)}
                  className="w-full text-left px-3 py-2 rounded-xl text-[12px] text-white/80 hover:text-white hover:bg-white/5 transition-all truncate"
                >
                  📄 {t.title}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. Invoices Popover */}
      {showInvoicesDropdown && (
        <div 
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
          className="compose-popover w-72 bg-[#1a2233] border border-white/10 rounded-2xl shadow-xl z-[200] flex flex-col max-h-[300px]"
        >
          <div className="p-3 text-[12px] font-800 uppercase tracking-widest text-slate-400 border-b border-white/5">Link Unpaid Invoice</div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
            {invoices.length === 0 ? (
              <div className="text-[12px] text-slate-500 p-4 text-center">No unpaid invoices found.</div>
            ) : (
              invoices.map(inv => (
                <button 
                  key={inv.id} 
                  onClick={() => handleInsertInvoice(inv)}
                  className="w-full text-left px-3 py-2 rounded-xl text-[12px] text-white/80 hover:text-white hover:bg-white/5 transition-all"
                >
                  <div className="font-600 truncate"># {inv.invoice_number}</div>
                  <div className="text-[11px] text-[#8a94a6] flex justify-between mt-0.5">
                    <span>Due: ${inv.due_amount}</span>
                    <span>Total: ${inv.amount}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. Signature Popover */}
      {showSignatureDropdown && (
        <div 
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
          className="compose-popover w-80 bg-[#1a2233] border border-white/10 rounded-2xl shadow-xl p-4 z-[200] flex flex-col gap-3"
        >
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <span className="text-[12px] font-800 uppercase tracking-widest text-slate-400">My Email Signature</span>
            {!editSignatureMode && signatureText && (
              <button 
                onClick={() => setEditSignatureMode(true)}
                className="text-[11px] font-700 text-blue-400 hover:text-blue-300"
              >
                Edit
              </button>
            )}
          </div>

          {!editSignatureMode ? (
            <div className="flex flex-col gap-2">
              {signatureText ? (
                <>
                  <div 
                    dangerouslySetInnerHTML={{ __html: signatureText }} 
                    className="text-[12px] p-2 bg-[#090d16] border border-white/5 rounded-xl max-h-[120px] overflow-y-auto"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={handleInsertSignatureAtCursor}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-700 py-1.5 rounded-xl transition-all"
                    >
                      Insert signature
                    </button>
                    <button 
                      onClick={handleRemoveSignatureFromEditor}
                      className="px-2 bg-red-900/40 hover:bg-red-900/60 border border-red-500/20 text-red-400 text-[11px] font-700 py-1.5 rounded-xl transition-all"
                      title="Remove signature from editor"
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="text-[12px] text-slate-400 mb-2">No signature configured in database.</div>
                  <button 
                    onClick={() => setEditSignatureMode(true)}
                    className="bg-[#1c2436] hover:bg-[#252f47] border border-white/10 text-white text-[11px] font-700 px-3 py-1.5 rounded-xl transition-all"
                  >
                    Create Signature
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="text-[11px] text-slate-400">Draw signature below:</div>
              <canvas
                ref={canvasRef}
                width={288}
                height={120}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full bg-[#090d16] border border-white/10 rounded-xl cursor-crosshair touch-none"
              />
              <div className="flex justify-between items-center mt-1">
                <button
                  type="button"
                  onClick={handleClearSignature}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-700 text-slate-300 hover:text-white transition-all"
                >
                  Clear Pad
                </button>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setEditSignatureMode(false)}
                    className="px-3 py-1.5 rounded-xl hover:bg-white/5 text-[11px] font-600 text-slate-400 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveSignature}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-700 px-3 py-1.5 rounded-xl transition-all shadow-md shadow-blue-600/10"
                  >
                    Save to Profile
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Emoji Popover */}
      {showEmojiPopover && (
        <div 
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
          className="compose-popover w-64 bg-[#1a2233] border border-white/10 rounded-2xl shadow-xl p-3 z-[200] flex flex-wrap gap-2 max-h-[220px] overflow-y-auto custom-scrollbar justify-center"
        >
          {['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'].map(emoji => (
            <button 
              key={emoji}
              onClick={() => {
                if (editorRef.current) {
                  restoreSelection();
                  execCommand('insertHTML', emoji);
                }
                setShowEmojiPopover(false);
              }}
              className="w-7 h-7 text-[16px] hover:bg-white/10 rounded flex items-center justify-center transition-all active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Custom Discard Confirmation Modal */}
      {showConfirmDiscard && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#121826] border border-white/10 rounded-3xl p-6 w-full max-w-[400px] shadow-2xl flex flex-col gap-4 text-center text-white">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-[16px] font-800">Discard Message?</h3>
            <p className="text-[13px] text-slate-400 leading-relaxed">
              Are you sure you want to discard this message? Your changes will be permanently lost.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowConfirmDiscard(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[12px] font-700 py-2.5 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmDiscard(false);
                  onClose();
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[12px] font-700 py-2.5 rounded-xl transition-all shadow-md shadow-red-600/10"
              >
                Yes, discard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
