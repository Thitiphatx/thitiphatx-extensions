"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTags = exports.isLastPage = exports.parseSearchtag = exports.parseSearch = exports.parseViewMore = exports.parseRandomManga = exports.parseRandomSections = exports.parseHomeSections = exports.parseUpdatedManga = exports.parseChapterDetails = exports.parseChapters = exports.parseMangaDetails = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const entities = require("entities");
const parseMangaDetails = ($, mangaId) => {
    const titles = [];
    titles.push(decodeHTMLEntity($('div.container > div.row > div.col-12.col-md-9 div.card > div.card-header > b').first().text().trim()));
    const row = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row');
    let image = $('div.col-12.col-md-4 > img', row).attr('src') ?? 'https://i.imgur.com/GYUxEX8.png';
    const story = $('div.col-12.col-md-8 > p:nth-child(3) > small > a', row).text().trim() ?? '';
    const author = $('div.col-12.col-md-8 > p:nth-child(4) > small > a', row).text().trim() ?? '';
    const description = $('div.col-12.col-md-8', row).contents().first().text().trim() ?? '';
    let hentai = true;
    const arrayTags = [];
    for (const tag of $('div.tags', 'div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-8 > small:nth-child(12)').toArray()) {
        const label = $('a.badge.badge-secondary.badge-up', tag).text().trim();
        if (!label)
            continue;
        arrayTags.push({ id: label, label: label });
    }
    arrayTags.push({ id: encodeURI(`${author}`), label: author });
    if (!(story.includes('ทั่วไป'))) {
        arrayTags.push({ id: encodeURI(`${story}`), label: `เรื่อง ${story}` });
    }
    const tagSections = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })];
    return createManga({
        id: mangaId,
        titles: titles,
        image: image,
        hentai: hentai,
        status: paperback_extensions_common_1.MangaStatus.ONGOING,
        author: author,
        artist: author,
        tags: tagSections,
        desc: description,
    });
};
exports.parseMangaDetails = parseMangaDetails;
const parseChapters = ($, mangaId) => {
    const chapters = [];
    let i = 0;
    if ($('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.no-padding > table.table.table-hover.table-episode > tbody').length != 0) {
        for (const chapter of $('tr', 'div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.no-padding > table.table.table-hover.table-episode > tbody').toArray()) {
            i++;
            const title = $('td > a', chapter).text().trim() ?? '';
            const chapterId = $('td > a', chapter).attr('href')?.split('/')[4] ?? '';
            const time = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.sr-post-header > small').text().trim();
            const date = parseDate(time);
            new Error(`${title}, ${chapterId}`);
            if (!chapterId)
                continue;
            const chapNum = Number(chapterId.replace("ep-", ""));
            if (!chapterId || !title)
                continue;
            chapters.push({
                id: chapterId,
                mangaId,
                name: decodeHTMLEntity(title),
                langCode: paperback_extensions_common_1.LanguageCode.THAI,
                chapNum: isNaN(chapNum) ? i : chapNum,
                time: date
            });
            i--;
        }
    }
    else {
        const title = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-header > b').first().text().trim();
        const date = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.sr-post-header > small').first().text().trim();
        const time = parseDate(date);
        chapters.push({
            id: 'null',
            mangaId,
            name: decodeHTMLEntity(title),
            langCode: paperback_extensions_common_1.LanguageCode.THAI,
            chapNum: 1,
            time: time
        });
    }
    return chapters.map(chapter => {
        return createChapter(chapter);
    });
};
exports.parseChapters = parseChapters;
const parseChapterDetails = ($, mangaId, chapterId) => {
    const pages = [];
    for (const images of $('img', '#manga-content').toArray()) {
        let image = $(images).attr('data-src')?.trim();
        if (image && image.startsWith('/'))
            image = 'https:' + image;
        if (image)
            pages.push(image);
    }
    const chapterDetails = createChapterDetails({
        id: chapterId,
        mangaId,
        pages: pages,
        longStrip: false,
    });
    return chapterDetails;
};
exports.parseChapterDetails = parseChapterDetails;
const parseUpdatedManga = ($, time, ids) => {
    const updatedManga = [];
    let loadMore = true;
    for (const manga of $('div.col-6.col-sm-4.col-md-3.mb-3.inz-col', 'div.container > div.row > div.col-sm-12.col-md-9 > div.card > div.card-body > div.row').toArray()) {
        const id = $('a.no-underline.inz-a', manga).attr('href').split('/')[3] ?? '';
        const date = $('a.no-underline.inz-a > div.row.inz-detail > div.col-6.text-left > small', manga).first().text().trim() ?? '';
        let mangaDate = new Date();
        if (date !== 'วันนี้') {
            mangaDate = parseDate(date);
        }
        if (!id || !mangaDate)
            continue;
        if (mangaDate > time) {
            if (ids.includes(id)) {
                updatedManga.push(id);
            }
        }
        else {
            loadMore = false;
        }
    }
    return {
        ids: updatedManga,
        loadMore,
    };
};
exports.parseUpdatedManga = parseUpdatedManga;
const parseHomeSections = ($, sectionCallback) => {
    const latestSection = createHomeSection({ id: 'latest_doujin', title: 'Latest Doujin', view_more: true });
    const latestSection_Array = [];
    for (const item of $('div.col-6.col-sm-4.col-md-3.mb-3.inz-col', 'div.container > div.row > div.col-sm-12.col-md-9 > div.card > div.card-body > div.row').toArray()) {
        let image = $('a.no-underline.inz-a > img.inz-img-thumbnail', item).first().attr('src') ?? '';
        const title = $('a.no-underline.inz-a > div.inz-thumbnail-title-box > div.inz-title', item).first().text().trim() ?? '';
        const id = $('a.no-underline.inz-a', item).attr('href').split('/')[3] ?? '';
        const subtitle = $('a.no-underline.inz-a > div.row.inz-detail > div.col-6.text-left > small', item).first().text().trim() ?? '';
        if (!id || !title)
            continue;
        latestSection_Array.push(createMangaTile({
            id: id,
            image: image,
            title: createIconText({ text: decodeHTMLEntity(title) }),
            subtitleText: createIconText({ text: subtitle }),
        }));
    }
    latestSection.items = latestSection_Array;
    sectionCallback(latestSection);
};
exports.parseHomeSections = parseHomeSections;
const parseRandomSections = (id, $, sectionCallback) => {
    const randomSection0 = createHomeSection({ id: 'random0', title: 'Random', view_more: false, type: paperback_extensions_common_1.HomeSectionType.featured });
    const randomSection1 = createHomeSection({ id: 'random1', title: 'Random', view_more: false });
    const randomSection2 = createHomeSection({ id: 'random2', title: 'Random', view_more: false });
    const randomSection3 = createHomeSection({ id: 'random3', title: 'Random', view_more: false });
    const randomSection4 = createHomeSection({ id: 'random4', title: 'Random', view_more: false });
    const randomSection5 = createHomeSection({ id: 'random5', title: 'Random', view_more: false });
    switch (id) {
        case '52e6d':
            randomSection0.items = (0, exports.parseRandomManga)($);
            sectionCallback(randomSection0);
            break;
        case 'wfxsq':
            randomSection1.items = (0, exports.parseRandomManga)($);
            sectionCallback(randomSection1);
            break;
        case 'ng709':
            randomSection2.items = (0, exports.parseRandomManga)($);
            sectionCallback(randomSection2);
            break;
        case 'sbjdo':
            randomSection3.items = (0, exports.parseRandomManga)($);
            sectionCallback(randomSection3);
            break;
        case '3xuxg':
            randomSection4.items = (0, exports.parseRandomManga)($);
            sectionCallback(randomSection4);
            break;
        case '3p47g':
            randomSection5.items = (0, exports.parseRandomManga)($);
            sectionCallback(randomSection5);
            break;
        default:
            throw new Error('Requested to section for a section ID which doesn\'t exist');
    }
};
exports.parseRandomSections = parseRandomSections;
const parseRandomManga = ($) => {
    const manga_Array = [];
    for (const item of $('div.col-6.col-sm-4.col-md-3.mb-3.inz-col', 'div.container > div.row > div.col-12.col-md-9 > div.card > div.card-body > div.row').toArray()) {
        let image = $('a > img', item).first().attr('src') ?? '';
        const title = $('a > div.inz-thumbnail-title-box > div.inz-title', item).first().text().trim() ?? '';
        const id = $('a', item).attr('href').split('/')[3] ?? '';
        if (!id || !title)
            continue;
        manga_Array.push(createMangaTile({
            id,
            image,
            title: createIconText({ text: decodeHTMLEntity(title) }),
        }));
    }
    return manga_Array;
};
exports.parseRandomManga = parseRandomManga;
const parseViewMore = ($) => {
    const comics = [];
    const collectedIds = [];
    for (const item of $('div.col-6.col-sm-4.col-md-3.mb-3.inz-col', 'div.container > div.row > div.col-sm-12.col-md-9 > div.card > div.card-body > div.row').toArray()) {
        let image = $('a.no-underline.inz-a > img.inz-img-thumbnail', item).first().attr('src') ?? '';
        const title = $('a.no-underline.inz-a > div.inz-thumbnail-title-box > div.inz-title', item).first().text().trim() ?? '';
        const id = $('a.no-underline.inz-a', item).attr('href').split('/')[3] ?? '';
        const subtitle = $('a.no-underline.inz-a > div.row.inz-detail > div.col-6.text-left > small', item).first().text().trim() ?? '';
        if (!id || !title)
            continue;
        if (collectedIds.includes(id))
            continue;
        comics.push(createMangaTile({
            id,
            image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
            title: createIconText({ text: decodeHTMLEntity(title) }),
            subtitleText: createIconText({ text: subtitle }),
        }));
        collectedIds.push(id);
    }
    return comics;
};
exports.parseViewMore = parseViewMore;
const parseSearch = ($, mangaId) => {
    const mangaItems = [];
    const collectedIds = [];
    let image = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-4 > img').attr('src') ?? 'https://i.imgur.com/GYUxEX8.png';
    const title = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-header > b').first().text().trim();
    const subtitle = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-8 > p:nth-child(4) > small > a').text().trim() ?? '';
    mangaItems.push(createMangaTile({
        id: mangaId,
        image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
        title: createIconText({ text: title }),
        subtitleText: createIconText({ text: subtitle }),
    }));
    collectedIds.push(mangaId);
    return mangaItems;
};
exports.parseSearch = parseSearch;
const parseSearchtag = ($) => {
    const mangaItems = [];
    const collectedIds = [];
    for (const item of $('div.col-6.col-sm-4.col-md-3.mb-3.inz-col', 'div.container > div.row > div.col-sm-12.col-md-9 > div.card > div.card-body > div.row').toArray()) {
        let image = $('a.no-underline.inz-a > img.inz-img-thumbnail', item).first().attr('src') ?? '';
        const title = $('a.no-underline.inz-a > div.inz-thumbnail-title-box > div.inz-title', item).first().text().trim() ?? '';
        const id = $('a.no-underline.inz-a', item).attr('href').split('/')[3] ?? '';
        const subtitle = $('a.no-underline.inz-a > div.row.inz-detail > div.col-6.text-left > small', item).first().text().trim() ?? '';
        if (!id || !title)
            continue;
        if (collectedIds.includes(id))
            continue;
        mangaItems.push(createMangaTile({
            id,
            image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
            title: createIconText({ text: decodeHTMLEntity(title) }),
            subtitleText: createIconText({ text: subtitle }),
        }));
        collectedIds.push(id);
    }
    return mangaItems;
};
exports.parseSearchtag = parseSearchtag;
const decodeHTMLEntity = (str) => {
    return entities.decodeHTML(str);
};
const isLastPage = ($) => {
    let isLast = false;
    const pages = [];
    for (const page of $('option', 'div.container > div.row > div.col-sm-12.col-md-9 > div.row.mb-3 > div.col-md-8.col-4 > select').toArray()) {
        const p = Number($(page).text().trim());
        if (isNaN(p))
            continue;
        pages.push(p);
    }
    const lastPage = Math.max(...pages);
    const currentPage = Number($('div.container > div.row > div.col-sm-12.col-md-9 > div.row.mb-3 > div.col-md-8.col-4 > select').val());
    if (currentPage >= lastPage)
        isLast = true;
    return isLast;
};
exports.isLastPage = isLastPage;
const parseTags = ($) => {
    const arrayTags = [];
    for (const tag of $('a', 'div.container > div.row > div.col-sm-12.col-md-3 div.card > div.card-body').toArray()) {
        const label = $(tag).text().trim();
        const id = $(tag).attr('href')?.split("/")[4] ?? '';
        if (!id || !label)
            continue;
        arrayTags.push({ id: id, label: label });
    }
    const tagSections = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })];
    return tagSections;
};
exports.parseTags = parseTags;
const parseDate = (date) => {
    let time;
    const number = Number(date.replace(/[^0-9]/g, ''));
    if (date.includes('LESS THAN AN HOUR') || date.includes('JUST NOW')) {
        time = new Date(Date.now());
    }
    else if (date.includes('ปี') || date.includes('YEARS')) {
        time = new Date(Date.now() - (number * 31556952000));
    }
    else if (date.includes('เดือน') || date.includes('MONTHS')) {
        time = new Date(Date.now() - (number * 2592000000));
    }
    else if (date.includes('สัปดาห์') || date.includes('WEEKS')) {
        time = new Date(Date.now() - (number * 604800000));
    }
    else if (date.includes('YESTERDAY')) {
        time = new Date(Date.now() - 86400000);
    }
    else if (date.includes('วัน') || date.includes('DAYS')) {
        time = new Date(Date.now() - (number * 86400000));
    }
    else if (date.includes('ชั่วโมง') || date.includes('HOURS')) {
        time = new Date(Date.now() - (number * 3600000));
    }
    else if (date.includes('นาที') || date.includes('MINUTES')) {
        time = new Date(Date.now() - (number * 60000));
    }
    else if (date.includes('วินาที') || date.includes('SECONDS')) {
        time = new Date(Date.now() - (number * 1000));
    }
    else {
        const split = date.split('-');
        time = new Date(Number(split[2]), Number(split[0]) - 1, Number(split[1]));
    }
    return time;
};
