"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class NoteStore {
    constructor(context) {
        this.notes = [];
        this.file = path.join(context.globalStorageUri.fsPath, 'notes.json');
        this.load();
    }
    load() { try {
        const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        this.notes = Array.isArray(raw) ? raw : [];
    }
    catch {
        this.notes = [];
    } }
    save() { fs.mkdirSync(path.dirname(this.file), { recursive: true }); fs.writeFileSync(this.file, JSON.stringify(this.notes, null, 2), 'utf8'); }
    all() { return [...this.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
    get(id) { return this.notes.find(n => n.id === id); }
    upsert(note) { const i = this.notes.findIndex(n => n.id === note.id); if (i < 0)
        this.notes.push(note);
    else
        this.notes[i] = note; this.save(); }
    remove(id) { this.notes = this.notes.filter(n => n.id !== id); this.save(); }
    replace(notes) { this.notes = notes; this.save(); }
}
class GroupItem extends vscode.TreeItem {
    constructor(labelText, kind, key, children = true) {
        super(labelText, children ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
        this.labelText = labelText;
        this.kind = kind;
        this.key = key;
        this.contextValue = kind;
        this.iconPath = new vscode.ThemeIcon(kind === 'category' ? 'folder' : kind === 'day' ? 'calendar' : key === 'favorites' ? 'star-full' : key === 'archive' ? 'archive' : 'trash');
    }
}
class NoteItem extends vscode.TreeItem {
    constructor(note) {
        super(`${note.favorite ? '★ ' : ''}${note.title}`, vscode.TreeItemCollapsibleState.None);
        this.note = note;
        this.description = `${note.day ? note.day + ' · ' : ''}${note.category}${note.tags.length ? ' · #' + note.tags.join(' #') : ''}`;
        this.tooltip = `${note.title}\n${note.tags.map(t => '#' + t).join(' ')}`;
        this.iconPath = new vscode.ThemeIcon(note.favorite ? 'star-full' : 'note');
        this.contextValue = 'note';
        this.command = { command: 'codeNotes.openNote', title: 'Open Note', arguments: [note] };
    }
}
class NotesProvider {
    constructor(store) {
        this.store = store;
        this.emitter = new vscode.EventEmitter();
        this.onDidChangeTreeData = this.emitter.event;
        this.filter = {};
    }
    refresh() { this.emitter.fire(); }
    setFilter(filter) { this.filter = filter; this.refresh(); }
    visible() { const f = this.filter; return this.store.all().filter(n => { const q = (f.query || '').toLowerCase(); const text = [n.title, n.category, n.day || '', n.content, ...n.tags].join(' ').toLowerCase(); if (q && !text.includes(q))
        return false; if (f.category && n.category !== f.category)
        return false; if (f.day && n.day !== f.day)
        return false; if (f.tag && !n.tags.includes(f.tag))
        return false; if (f.mode === 'trash')
        return !!n.deletedAt; if (f.mode === 'archive')
        return !n.deletedAt && !!n.archived; if (f.mode === 'favorites')
        return !n.deletedAt && !n.archived && !!n.favorite; return !n.deletedAt && !n.archived; }); }
    allForGroup() { const f = this.filter; return this.store.all().filter(n => { const q = (f.query || '').trim().toLowerCase(); const text = [n.title, n.category, n.day || '', n.content, ...n.tags].join(' ').toLowerCase(); if (q && !text.includes(q))
        return false; if (f.category && (n.category || 'General') !== f.category)
        return false; if (f.day && n.day !== f.day)
        return false; if (f.tag && !n.tags.includes(f.tag))
        return false; return true; }); }
    getTreeItem(item) { return item; }
    getChildren(element) { const notes = this.visible(); const groupedNotes = this.allForGroup(); if (!element)
        return [new GroupItem('Favorites', 'special', 'favorites'), new GroupItem('Archive', 'special', 'archive'), new GroupItem('Trash', 'special', 'trash'), ...Array.from(new Set(notes.map(n => n.category || 'General'))).sort().map(c => new GroupItem(c, 'category', c))]; if (element instanceof GroupItem) {
        if (element.kind === 'special') {
            const source = element.key === 'favorites' ? groupedNotes.filter(n => !n.deletedAt && !n.archived && !!n.favorite) : element.key === 'archive' ? groupedNotes.filter(n => !n.deletedAt && !!n.archived) : groupedNotes.filter(n => !!n.deletedAt);
            return source.map(n => new NoteItem(n));
        }
        if (element.kind === 'category') {
            const days = Array.from(new Set(notes.filter(n => (n.category || 'General') === element.key).map(n => n.day || 'Unsorted'))).sort();
            return days.map(d => new GroupItem(d, 'day', `${element.key}::${d}`));
        }
        if (element.kind === 'day') {
            const parts = element.key.split('::');
            return notes.filter(n => (n.category || 'General') === parts[0] && (n.day || 'Unsorted') === parts[1]).map(n => new NoteItem(n));
        }
    } return []; }
    getParent(element) { return undefined; }
}
function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function markdownHtml(md) { let h = escapeHtml(md); h = h.replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>').replace(/```([\w+-]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>'); return h; }
function editorHtml(note, preview = false) {
    const n = Math.random().toString(36).slice(2);
    const content = preview ? markdownHtml(note.content) : `<textarea id="content" class="content-editor" placeholder="Write your lesson in Markdown...">${escapeHtml(note.content)}</textarea>`;
    const links = (note.codeLinks || []).map((l, i) => `<button class="link-card" data-link="${i}"><span class="link-icon">⌘</span><span><b>${escapeHtml(l.file)}</b><small>Line ${l.line}, column ${l.column}</small></span><span class="link-arrow">›</span></button>`).join('') || '<div class="empty-links">No code links yet. Capture a link from the editor context menu.</div>';
    return `<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none';style-src 'unsafe-inline';script-src 'nonce-${n}'"><style>
 :root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;padding:0 28px 36px;background:var(--vscode-editor-background);color:var(--vscode-foreground);font-family:var(--vscode-font-family);font-size:13px;line-height:1.55}.shell{max-width:1080px;margin:0 auto}.topbar{display:flex;align-items:center;justify-content:space-between;padding:24px 0 20px;border-bottom:1px solid var(--vscode-panel-border)}.eyebrow{color:var(--vscode-textLink-foreground);font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.title{margin:4px 0 0;font-size:25px;line-height:1.2;font-weight:700;letter-spacing:-.02em}.subtitle{margin:6px 0 0;color:var(--vscode-descriptionForeground)}.status{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border:1px solid var(--vscode-input-border);border-radius:999px;color:var(--vscode-descriptionForeground);font-size:11px}.dot{width:7px;height:7px;background:#4ec9b0;border-radius:50%}.layout{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:20px;padding-top:22px}.card{background:var(--vscode-sideBar-background);border:1px solid var(--vscode-panel-border);border-radius:10px;padding:18px;box-shadow:0 3px 12px rgba(0,0,0,.08)}.card h2{margin:0 0 15px;font-size:13px;font-weight:700}.field-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:12px}.field{margin-bottom:13px}label{display:flex;justify-content:space-between;margin-bottom:6px;color:var(--vscode-descriptionForeground);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em}input,textarea{width:100%;border:1px solid var(--vscode-input-border);border-radius:7px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);font:inherit;padding:9px 11px;outline:none;transition:border-color .15s,box-shadow .15s}input:focus,textarea:focus{border-color:var(--vscode-focusBorder);box-shadow:0 0 0 2px color-mix(in srgb,var(--vscode-focusBorder) 22%,transparent)}.content-editor{min-height:440px;resize:vertical;font-family:var(--vscode-editor-font-family);font-size:var(--vscode-editor-font-size);line-height:1.65}.toolbar{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px;padding-top:15px;border-top:1px solid var(--vscode-panel-border)}button{font:inherit;cursor:pointer}.btn{border:1px solid var(--vscode-button-border,var(--vscode-button-background));border-radius:6px;padding:8px 12px;color:var(--vscode-button-foreground);background:var(--vscode-button-background);font-weight:600}.btn:hover{background:var(--vscode-button-hoverBackground)}.btn.secondary{background:transparent;color:var(--vscode-foreground);border-color:var(--vscode-input-border)}.btn.secondary:hover{background:var(--vscode-toolbar-hoverBackground)}.btn.danger{color:var(--vscode-errorForeground);background:transparent;border-color:color-mix(in srgb,var(--vscode-errorForeground) 45%,var(--vscode-input-border))}.preview{min-height:440px;padding:4px 2px}.preview h1,.preview h2,.preview h3{line-height:1.25;margin-top:0}.preview pre{overflow:auto;padding:14px;border-radius:7px;background:var(--vscode-textCodeBlock-background);border:1px solid var(--vscode-panel-border)}.preview code{font-family:var(--vscode-editor-font-family);color:var(--vscode-textPreformat-foreground)}.preview blockquote{margin-left:0;padding-left:13px;border-left:3px solid var(--vscode-textLink-foreground);color:var(--vscode-descriptionForeground)}.side-stack{display:flex;flex-direction:column;gap:15px}.meta-row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--vscode-panel-border)}.meta-row:last-child{border-bottom:0}.meta-label{color:var(--vscode-descriptionForeground)}.tag-list{display:flex;flex-wrap:wrap;gap:5px}.tag{padding:3px 7px;border-radius:999px;background:color-mix(in srgb,var(--vscode-textLink-foreground) 16%,transparent);color:var(--vscode-textLink-foreground);font-size:11px}.link-card{display:flex;align-items:center;gap:9px;width:100%;padding:9px 0;text-align:left;border:0;border-bottom:1px solid var(--vscode-panel-border);background:transparent;color:var(--vscode-foreground)}.link-card:hover{color:var(--vscode-textLink-foreground)}.link-icon{display:grid;place-items:center;width:24px;height:24px;border-radius:6px;background:var(--vscode-textCodeBlock-background);color:var(--vscode-textLink-foreground)}.link-card b,.link-card small{display:block}.link-card small{color:var(--vscode-descriptionForeground);font-size:11px}.link-arrow{margin-left:auto;font-size:20px;color:var(--vscode-descriptionForeground)}.empty-links{padding:8px 0;color:var(--vscode-descriptionForeground);font-size:12px}.notice{margin-top:14px;padding:10px 12px;border-radius:7px;background:color-mix(in srgb,var(--vscode-textLink-foreground) 10%,transparent);color:var(--vscode-descriptionForeground);font-size:12px}@media(max-width:760px){body{padding:0 15px 26px}.layout{grid-template-columns:1fr}.field-grid{grid-template-columns:1fr}.topbar{align-items:flex-start;gap:12px;flex-direction:column}}
 </style></head><body><div class="shell"><header class="topbar"><div><div class="eyebrow">Code Notes & Lessons</div><div class="title">${escapeHtml(note.title)}</div><div class="subtitle">Capture what you learn. Keep it searchable.</div></div><div class="status"><span class="dot"></span>${preview ? 'Preview mode' : 'Editing'}</div></header><div class="layout"><main class="card"><h2>${preview ? 'Lesson preview' : 'Note details'}</h2>${preview ? `<article class="preview">${content}</article>` : `<div class="field-grid"><div class="field"><label>Title</label><input id="title" value="${escapeHtml(note.title)}"></div><div class="field"><label>Category</label><input id="category" value="${escapeHtml(note.category)}"></div><div class="field"><label>Day</label><input id="day" value="${escapeHtml(note.day || '')}" placeholder="Day 1"></div></div><div class="field"><label>Tags <span>comma separated</span></label><input id="tags" value="${escapeHtml(note.tags.join(', '))}" placeholder="python, basics, loops"></div><div class="field"><label>Markdown content</label>${content}</div>`}<div class="toolbar"><button class="btn" id="save">Save note</button><button class="btn secondary" id="preview">${preview ? 'Back to editor' : 'Preview Markdown'}</button><button class="btn secondary" id="copy">Copy Markdown</button><button class="btn secondary" id="fav">${note.favorite ? '★ Favorited' : '☆ Favorite'}</button><button class="btn secondary" id="archive">${note.archived ? 'Restore archive' : 'Archive'}</button><button class="btn danger" id="delete">${note.deletedAt ? 'Delete permanently' : 'Move to trash'}</button></div></main><aside class="side-stack"><section class="card"><h2>Note overview</h2><div class="meta-row"><span class="meta-label">Category</span><b>${escapeHtml(note.category)}</b></div><div class="meta-row"><span class="meta-label">Day</span><b>${escapeHtml(note.day || 'Unassigned')}</b></div><div class="meta-row"><span class="meta-label">Tags</span><div class="tag-list">${note.tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('') || '<span class="meta-label">None</span>'}</div></div></section><section class="card"><h2>Code links</h2>${links}</section><div class="notice">Tip: Select code in any editor and use <b>Create Note</b> to start with a ready-to-edit snippet.</div></aside></div></div><script nonce="${n}">const v=acquireVsCodeApi();const id=${JSON.stringify(note.id)};const el=x=>document.getElementById(x);el('save').onclick=()=>{if(${preview})return;v.postMessage({type:'save',note:{id,title:el('title')?.value?.trim() || 'Untitled note',category:el('category')?.value?.trim() || 'General',day:el('day')?.value?.trim() || undefined,tags:el('tags')?.value.split(',').map(x=>x.trim()).filter(Boolean),content:el('content')?.value || ''}});};el('preview').onclick=()=>v.postMessage({type:'preview'});el('copy').onclick=()=>v.postMessage({type:'copy',content:${JSON.stringify(note.content)}});el('fav').onclick=()=>v.postMessage({type:'favorite'});el('archive').onclick=()=>v.postMessage({type:'archive'});el('delete').onclick=()=>v.postMessage({type:'trash'});document.querySelectorAll('[data-link]').forEach(a=>a.onclick=()=>v.postMessage({type:'link',index:Number(a.dataset.link)}));</script></body></html>`;
}
function activate(context) {
    const store = new NoteStore(context), provider = new NotesProvider(store);
    context.subscriptions.push(vscode.window.registerTreeDataProvider('codeNotesExplorer', provider));
    const openNote = (note) => { const panel = vscode.window.createWebviewPanel('codeNoteEditor', note.title, vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true }); let preview = false; const render = () => panel.webview.html = editorHtml(note, preview); render(); panel.webview.onDidReceiveMessage(async (m) => { if (m.type === 'save') {
        Object.assign(note, m.note, { updatedAt: new Date().toISOString() });
        store.upsert(note);
        provider.refresh();
        vscode.window.showInformationMessage('Note saved.');
    }
    else if (m.type === 'preview') {
        preview = !preview;
        render();
    }
    else if (m.type === 'copy') {
        await vscode.env.clipboard.writeText(m.content);
        vscode.window.showInformationMessage('Markdown copied.');
    }
    else if (m.type === 'favorite') {
        note.favorite = !note.favorite;
        note.updatedAt = new Date().toISOString();
        store.upsert(note);
        provider.refresh();
        render();
    }
    else if (m.type === 'archive') {
        note.archived = !note.archived;
        note.updatedAt = new Date().toISOString();
        store.upsert(note);
        provider.refresh();
        render();
    }
    else if (m.type === 'trash') {
        if (note.deletedAt) {
            store.remove(note.id);
            panel.dispose();
            provider.refresh();
            vscode.window.showInformationMessage('Note deleted.');
            return;
        }
        note.deletedAt = new Date().toISOString();
        note.archived = false;
        note.updatedAt = new Date().toISOString();
        store.upsert(note);
        provider.refresh();
        render();
    }
    else if (m.type === 'link') {
        const l = note.codeLinks?.[m.index];
        if (l) {
            const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFile ? vscode.Uri.file(path.dirname(vscode.workspace.workspaceFile.fsPath)) : vscode.Uri.file(process.cwd()), l.file);
            vscode.window.showTextDocument(uri, { selection: new vscode.Range(Math.max(0, l.line - 1), Math.max(0, l.column - 1), Math.max(0, l.line - 1), Math.max(0, l.column - 1)) });
        }
    } }, undefined, context.subscriptions); };
    const createNote = async () => { const title = await vscode.window.showInputBox({ prompt: 'Note title' }); if (!title)
        return; const now = new Date().toISOString(), e = vscode.window.activeTextEditor, selected = e && e.selection.isEmpty ? '' : e?.document.getText(e.selection) || ''; const note = { id: `note-${Date.now()}`, title, category: vscode.workspace.getConfiguration('codeNotes').get('defaultCategory', 'General'), tags: [], content: selected ? `# Selected Code\n\n\`\`\`\n${selected}\n\`\`\`\n` : '# New lesson\n\n', createdAt: now, updatedAt: now }; store.upsert(note); provider.refresh(); openNote(note); };
    const search = async () => { const q = await vscode.window.showInputBox({ prompt: 'Search title, content, category, day, or tag' }); if (q !== undefined)
        provider.setFilter({ ...{}, query: q }); };
    const advanced = async () => { const category = await vscode.window.showInputBox({ prompt: 'Category filter (leave blank for all)' }); if (category === undefined)
        return; const tag = await vscode.window.showInputBox({ prompt: 'Tag filter (leave blank for all)' }); if (tag === undefined)
        return; const day = await vscode.window.showInputBox({ prompt: 'Day filter (leave blank for all)' }); if (day === undefined)
        return; provider.setFilter({ category: category || undefined, tag: tag || undefined, day: day || undefined }); };
    const capture = async () => { const e = vscode.window.activeTextEditor; if (!e)
        return; const notes = store.all().filter(n => !n.deletedAt); const p = await vscode.window.showQuickPick(notes.map(note => ({ label: note.title, note }))); if (!p)
        return; const l = { file: vscode.workspace.asRelativePath(e.document.uri), line: e.selection.active.line + 1, column: e.selection.active.character + 1 }; p.note.codeLinks = [...(p.note.codeLinks || []), l]; const selected = e.document.getText(e.selection); if (selected)
        p.note.content += `\n\n\`\`\`\n${selected}\n\`\`\`\n`; p.note.updatedAt = new Date().toISOString(); store.upsert(p.note); provider.refresh(); };
    const stats = () => { const ns = store.all().filter(n => !n.deletedAt); const byCat = ns.reduce((a, n) => (a[n.category] = (a[n.category] || 0) + 1, a), {}); const tags = ns.flatMap(n => n.tags).reduce((a, t) => (a[t] = (a[t] || 0) + 1, a), {}); vscode.window.showInformationMessage(`Notes: ${ns.length} | Favorites: ${ns.filter(n => n.favorite).length} | Archived: ${store.all().filter(n => n.archived && !n.deletedAt).length} | Categories: ${Object.entries(byCat).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'} | Tags: ${Object.entries(tags).map(([k, v]) => `#${k}=${v}`).join(', ') || 'none'}`); };
    const exportJson = async () => { const u = await vscode.window.showSaveDialog({ filters: { JSON: ['json'] } }); if (u)
        fs.writeFileSync(u.fsPath, JSON.stringify(store.all(), null, 2)); };
    const exportMd = async () => { const u = await vscode.window.showSaveDialog({ filters: { Markdown: ['md'] } }); if (u)
        fs.writeFileSync(u.fsPath, store.all().filter(n => !n.deletedAt).map(n => `# ${n.title}\n\n- Category: ${n.category}\n- Day: ${n.day || ''}\n- Tags: ${n.tags.map(t => '#' + t).join(' ')}\n\n${n.content}`).join('\n\n---\n\n')); };
    const importJson = async () => { const us = await vscode.window.showOpenDialog({ filters: { JSON: ['json'] }, canSelectMany: false }); if (!us?.[0])
        return; try {
        const x = JSON.parse(fs.readFileSync(us[0].fsPath, 'utf8'));
        if (!Array.isArray(x))
            throw 0;
        store.replace(x);
        provider.refresh();
    }
    catch {
        vscode.window.showErrorMessage('Invalid notes JSON.');
    } };
    const restore = async (item) => { item.note.deletedAt = undefined; item.note.archived = false; store.upsert(item.note); provider.refresh(); };
    context.subscriptions.push(...[['codeNotes.createNote', createNote], ['codeNotes.openNote', openNote], ['codeNotes.search', search], ['codeNotes.advancedFilter', advanced], ['codeNotes.captureCodeLink', capture], ['codeNotes.statistics', stats], ['codeNotes.exportJson', exportJson], ['codeNotes.exportMarkdown', exportMd], ['codeNotes.importJson', importJson], ['codeNotes.refresh', () => provider.refresh()], ['codeNotes.showFavorites', () => provider.setFilter({ mode: 'favorites' })], ['codeNotes.showArchive', () => provider.setFilter({ mode: 'archive' })], ['codeNotes.showTrash', () => provider.setFilter({ mode: 'trash' })], ['codeNotes.restore', restore]].map(([id, fn]) => vscode.commands.registerCommand(id, fn)));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map