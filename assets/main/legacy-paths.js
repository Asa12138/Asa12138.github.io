/* Browser bookmarks only: GitHub Pages cannot redirect programmatic downloads. */
(() => {
  const replacements = [
    ['/iPhylo_tutorial/', '/books/iPhylo_tutorial/'],
    ['/MetaNet_tutorial/', '/books/MetaNet_tutorial/'],
    ['/pctax_tutorial/', '/books/pctax_tutorial/'],
    ['/resources/', '/FileList/'],
    ['/CRISPRome/', '/databases/CRISPRome/']
  ];
  let path = location.pathname;
  const match = replacements.find(([old]) => path.startsWith(old) || path === old.slice(0,-1));
  if (match) {
    const destination = match[1] + (path.startsWith(match[0]) ? path.slice(match[0].length) : '');
    location.replace(destination + location.search + location.hash);
  } else if (path === '/qunqing.html' || path === '/qunqing' || /^\/qunqing\/.*(?:\.html)?$/.test(path)) {
    location.replace('https://asa12138.github.io/Asa_qunqing/' + location.search + location.hash);
  }
})();
