"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLastPage = exports.parseSearch = exports.parseViewMore = exports.parseHomeSections = exports.parseUpdatedManga = exports.parseChapterDetails = exports.parseChapters = exports.parseMangaDetails = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const entities = require("entities");
const parseMangaDetails = ($, mangaId) => {
    const titles = [];
    titles.push(decodeHTMLEntity($('div.wpm_pag.mng_det > h1').first().text().trim()));
    let image = $('img', 'div.cvr_ara').attr('src') ?? 'https://i.imgur.com/GYUxEX8.png';
    if (image.startsWith('/'))
        image = 'https:' + image;
    const author = $('div.det p:nth-child(7) a').text().trim() ?? '';
    const description = decodeHTMLEntity($('div.det > p:nth-child(3)').text().trim() ?? '');
    let hentai = false;
    const arrayTags = [];
    for (const tag of $('a', 'div.det > p:nth-child(9) a').toArray()) {
        const label = $(tag).text().trim();
        const id = $(tag).attr('href').split('/')[4] ?? '';
        if (!id || !label)
            continue;
        if (['ADULT', 'SMUT', 'MATURE'].includes(label.toUpperCase()))
            hentai = true;
        arrayTags.push({ id: id, label: label });
    }
    const tagSections = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })];
    const rawStatus = $('div.det > p:nth-child(13)').text().trim().split(' ')[1] ?? '';
    let status = paperback_extensions_common_1.MangaStatus.ONGOING;
    if (rawStatus.includes('แล้ว'))
        status = paperback_extensions_common_1.MangaStatus.COMPLETED;
    return createManga({
        id: mangaId,
        titles: titles,
        image: image,
        hentai: hentai,
        status: status,
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
    for (const chapter of $('li.lng_', 'div.wpm_pag.mng_det ul.lst').toArray()) {
        i++;
        const title = $('a > b.val', chapter).text().trim() ?? '';
        const chapterId = $('a', chapter).attr('href')?.split('/')[4] ?? '';
        if (!chapterId)
            continue;
        const chapNum = Number(chapterId); //We're manually setting the chapters regarless, however usually the ID equals the chapter number.
        const date = new Date($('a > b.dte', chapter).last().text().trim());
        if (!chapterId || !title)
            continue;
        chapters.push({
            id: chapterId,
            mangaId,
            name: decodeHTMLEntity(title),
            langCode: paperback_extensions_common_1.LanguageCode.THAI,
            chapNum: isNaN(chapNum) ? i : chapNum,
            time: date,
        });
        i--;
    }
    return chapters.map(chapter => {
        return createChapter(chapter);
    });
};
exports.parseChapters = parseChapters;
const parseChapterDetails = ($, mangaId, chapterId) => {
    const pages = [];
    for (const images of $('img', '#image-container > center').toArray()) {
        let image = $(images).attr('src')?.trim();
        if (image && image.startsWith('/'))
            image = 'https:' + image;
        if (image)
            pages.push(image);
    }
    const chapterDetails = createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages: pages,
        longStrip: false,
    });
    return chapterDetails;
};
exports.parseChapterDetails = parseChapterDetails;
const parseUpdatedManga = ($, time, ids) => {
    const updatedManga = [];
    let loadMore = true;
    for (const manga of $('div.row', '#sct_content div.con div.wpm_pag.mng_lts_chp.grp').toArray()) {
        const id = $('div.det a.ttl', manga).attr('href').split('/')[3] ?? '';
        const date = $('ul.lst li:nth-child(1) a b.dte', manga).text().trim() ?? '';
        let mangaDate = new Date();
        if (date.toUpperCase() !== 'วันนี้') {
            mangaDate = new Date(date);
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
    const latestSection = createHomeSection({ id: 'latest_comic', title: 'Latest Comics', view_more: true });
    const latestSection_Array = [];
    for (const comic of $('div.row', 'div.wpm_pag.mng_lts_chp.grp').toArray()) {
        let image = $('div.cvr > div > a > img', comic).first().attr('src') ?? '';
        if (image.startsWith('/'))
            image = 'https:' + image;
        const title = $('div.det > a', comic).first().text().trim() ?? '';
        const id = $('div.det > a', comic).attr('href').split('/')[3] ?? '';
        const subtitle = $('b.val.lng_', comic).first().text().trim() ?? '';
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
const parseViewMore = ($) => {
    const comics = [];
    const collectedIds = [];
    for (const item of $('div.nde', '#sct_content div.con div.wpm_pag.mng_lst.tbn').toArray()) {
        let image = $('div.cvr div.img_wrp a img', item).first().attr('src') ?? '';
        if (image.startsWith('/'))
            image = 'https:' + image;
        const title = $('div.det > a.ttl', item).first().text().trim() ?? '';
        const id = $('div.det a.ttl', item).attr('href').split('/')[3] ?? '';
        const subtitle = $('div.det ul.lst li a.lst b.val.lng_', item).first().text().trim() ?? '';
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
const parseSearch = ($) => {
    const comics = [];
    for (const obj of $('div.nde', '#sct_content div.con div.wpm_pag.mng_lst.tbn').toArray()) {
        let image = $('div.cvr div.img_wrp a img', obj).first().attr('src') ?? '';
        const title = $('div.det a', obj).first().text() ?? '';
        const id = $('a', obj).attr('href').split('/')[3] ?? '';
        const views = $('div.det > div.vws', obj).text().trim();
        const subtitle = views ? views + 'views' : 'N/A Views';
        if (!id || !title)
            continue;
        comics.push(createMangaTile({
            id,
            image: image,
            title: createIconText({ text: decodeHTMLEntity(title) }),
            subtitleText: createIconText({ text: decodeHTMLEntity(subtitle) })
        }));
    }
    return comics;
};
exports.parseSearch = parseSearch;
const decodeHTMLEntity = (str) => {
    return entities.decodeHTML(str);
};
const isLastPage = ($) => {
    let isLast = false;
    const pages = [];
    for (const page of $('li', 'ul.pgg').toArray()) {
        const p = Number($(page).text().trim());
        if (isNaN(p))
            continue;
        pages.push(p);
    }
    const lastPage = Math.max(...pages);
    const currentPage = Number($('li > a.sel').text().trim());
    if (currentPage >= lastPage)
        isLast = true;
    return isLast;
};
exports.isLastPage = isLastPage;
