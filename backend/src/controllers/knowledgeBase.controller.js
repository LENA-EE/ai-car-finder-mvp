const kbService = require('../services/knowledgeBase/knowledgeBase.service');
const { logAdminAction } = require('../repositories/audit.repository');

async function list(req, res) {
  try {
    const articles = await kbService.listArticles();
    res.json({ success: true, articles });
  } catch (err) {
    console.error('KB list error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
}

async function add(req, res) {
  const { title, description, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'VALIDATION', details: 'Title and content are required' });
  }

  try {
    const article = await kbService.addArticle(title, description, content);

    await logAdminAction(req.user.id, req.user.email, 'kb_add_article', {
      article_id: article.id,
      title: article.title,
    }, req);

    res.json({ success: true, article });
  } catch (err) {
    console.error('KB add error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
}

async function remove(req, res) {
  const { id } = req.params;

  try {
    const deleted = await kbService.deleteArticle(id);
    if (!deleted) {
      return res.status(404).json({ error: 'NOT_FOUND', details: 'Article not found' });
    }

    await logAdminAction(req.user.id, req.user.email, 'kb_delete_article', {
      article_id: deleted.id,
      title: deleted.title,
    }, req);

    res.json({ success: true, deleted });
  } catch (err) {
    console.error('KB delete error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
}

async function getOne(req, res) {
  try {
    const article = await kbService.getArticle(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'NOT_FOUND', details: 'Article not found' });
    }
    res.json({ success: true, article });
  } catch (err) {
    console.error('KB getOne error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { title, description, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'VALIDATION', details: 'Title and content are required' });
  }

  try {
    const article = await kbService.updateArticle(id, title, description, content);
    if (!article) {
      return res.status(404).json({ error: 'NOT_FOUND', details: 'Article not found' });
    }

    await logAdminAction(req.user.id, req.user.email, 'kb_update_article', {
      article_id: article.id,
      title: article.title,
    }, req);

    res.json({ success: true, article });
  } catch (err) {
    console.error('KB update error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
}

async function stats(req, res) {
  try {
    const data = await kbService.getStats();
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('KB stats error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
}

async function generateEmbeddings(req, res) {
  try {
    const result = await kbService.generateMissingEmbeddings();

    await logAdminAction(req.user.id, req.user.email, 'kb_generate_embeddings', {
      processed: result.processed,
      tokens: result.totalTokens,
    }, req);

    res.json({ success: true, ...result });
  } catch (err) {
    if (err.code) {
      return res.status(400).json({ error: err.code, details: err.message });
    }
    console.error('KB embeddings error:', err.message);
    res.status(500).json({ error: 'EMBEDDINGS_ERROR', details: err.message });
  }
}

module.exports = { list, add, getOne, update, remove, stats, generateEmbeddings };
