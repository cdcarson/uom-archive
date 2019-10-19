const parser = require('fast-xml-parser')
const he = require('he');
const fs = require('fs-extra');
const moment = require('moment');
const Twig = require('twig');
const path = require('path');
const marked = require('marked');
const _ = require('lodash');

const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();
Twig.cache(false);
module.exports = build = async () => {
  const data = await fs.readFile('./uphoffonmedia.xml');
  xmlData = data.toString();
  var options = {
    attributeNamePrefix: "@_",
    attrNodeName: "attr", //default is 'false'
    textNodeName: "#text",
    ignoreAttributes: true,
    ignoreNameSpace: true,
    allowBooleanAttributes: false,
    parseNodeValue: true,
    parseAttributeValue: false,
    trimValues: true,
    cdataTagName: false,
    cdataPositionChar: "\\c",
    localeRange: "", //To support non english character in tag/attribute values.
    parseTrueNumberOnly: false,
    attrValueProcessor: (val, attrName) => he.decode(val, { isAttributeValue: true }),//default is a=>a
    tagValueProcessor: (val, tagName) => he.decode(val), //default is a=>a
    stopNodes: ["parse-me-as-string"]
  };


  if (parser.validate(xmlData) === true) { //optional (it'll return an object in case it's not valid)
    var jsonObj = parser.parse(xmlData, options);
    const authors = jsonObj.rss.channel.author;
    const rssItems = jsonObj.rss.channel.item;
    const posts = [];
    await rssItems.forEach( async item => {
      if (item.post_type !== 'post' || item.status != 'publish') {
        return;
      }
      const normalized = item.link.replace(/(^http:\/\/www.uphoffonmedia.com\/)|(\/$)/g, '');
      const slugs = normalized.split('/').map(s => s.replace(/%[a-z0-9]{2}/g, ''));
      const relativeURL = '/' + slugs.join('/');
      const content = marked(entities.decode(item.encoded.toString()));
      const excerpt = content.replace(/(<([^>]+)>)/ig, '').substring(0, 300).trim();

      const m = moment(new Date(item.pubDate));
      const post = {
        m,
        date: m.format('LL'),
        relativeURL,
        slugs,
        title: item.title,
        content,
        excerpt,
        author: authors.find(a => a.author_login === item.creator),
        prevPost: null,
        nextPost: null
      };
      posts.push(post);
      
    });
    
    posts.sort((a, b) => {
      return b.m.valueOf() - a.m.valueOf();
    });

    posts.forEach((post, i) => {
      if (i > 0 ) {
        post.nextPost = posts[i - 1]
      } 
      if (i < posts.length - 1) {
        post.prevPost = posts[i + 1]
      } 
    });
    posts.forEach(async post => {
      const html = await render('./src/html/types/post.twig', { post });
      const out = path.join(process.cwd(), 'docs', ...post.slugs, 'index.html');
      await fs.outputFile(out, html);
    });

    const html = await render('./src/html/types/home.twig', {posts});
    const out = path.join(process.cwd(), 'docs', 'index.html');
    await fs.outputFile(out, html);

    const archives = [];
    const postsByYear = _.groupBy(posts, (post) => {
      return post.m.format('YYYY');
    });
    
    _.forEach(postsByYear, (yearposts, year) => {
      
      archives.push({ 
        archiveTitle: 'Yearly Archives: ' + moment().year(year).format('YYYY'),
        relativeURL: '/' + year, 
        slugs: [year], 
        posts: yearposts
      });
      
      const postsByMonth = _.groupBy(yearposts, (post) => {
        return post.m.format('MM');
      });
      _.forEach(postsByMonth, (monthposts, month) => {
        
        archives.push({
          archiveTitle: 'Monthly Archives: ' + _.first(monthposts).m.format('MMMM, YYYY'),
          relativeURL: '/' + year + '/' + month,
          slugs: [year, month],
          posts: monthposts
        });
        const postsByDay = _.groupBy(monthposts, (post) => {
          return post.m.format('DD');
        });
        _.forEach(postsByDay, (dayposts, day) => {

          archives.push({
            archiveTitle: 'Daily Archives: ' + _.first(dayposts).m.format('LL'),
            relativeURL: '/' + year + '/' + month + '/' + day,
            slugs: [year, month, day],
            posts: dayposts
          });
          
        })
      })
    });

    archives.forEach(async archive => {
      const html = await render('./src/html/types/archive.twig', archive);
      const out = path.join(process.cwd(), 'docs', ...archive.slugs, 'index.html');
      await fs.outputFile(out, html);
    })
    

  }

}





const render = async (p, data) => {
  return new Promise((resolve) => {
    Twig.renderFile(p, data, (err, result) => {
      if (err) {
        console.error(err.message);
        resolve(err.toString());
      } else {
        resolve(result);
      }
    })
  })
}



