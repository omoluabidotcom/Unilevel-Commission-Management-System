/**
 * Simple unilevel tree renderer (static demo data).
 */

function buildNode(node) {
  const item = document.createElement('div');
  item.className = 'tree-node';
  item.innerHTML = `<strong>${node.name}</strong><div class="tree-meta">${node.email}</div>`;

  if (node.children && node.children.length) {
    const children = document.createElement('div');
    children.className = 'tree-children';
    node.children.forEach((child) => {
      children.appendChild(buildNode(child));
    });
    item.appendChild(children);
  }

  return item;
}

function renderTree(rootId, data) {
  const root = document.getElementById(rootId);
  if (!root) return;

  root.innerHTML = '';
  root.appendChild(buildNode(data));
}

// Demo tree data
const demoTree = {
  name: 'Root Distributor',
  email: 'root@example.com',
  children: [
    {
      name: 'Affiliate A',
      email: 'a@example.com',
      children: [
        { name: 'Affiliate A1', email: 'a1@example.com' },
        { name: 'Affiliate A2', email: 'a2@example.com' },
      ],
    },
    { name: 'Affiliate B', email: 'b@example.com' },
  ],
};

window.addEventListener('DOMContentLoaded', () => {
  renderTree('treeRoot', demoTree);
});
