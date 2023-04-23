"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLastPage = exports.parseSearch = exports.parseViewMore = exports.parseHomeSections = exports.parseUpdatedManga = exports.parseChapterDetails = exports.parseChapters = exports.parseMangaDetails = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const entities = require("entities");
const parseMangaDetails = ($, mangaId) => {
    const titles = [];
    titles.push(decodeHTMLEntity($('div.container > div.row > div.col-12.col-md-9 div.card > div.card-header > b').first().text().trim()));
    let image = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-4 > img').attr('src') ?? 'https://i.imgur.com/GYUxEX8.png';
    const author = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-8 > p:nth-child(4) > small > a').text().trim() ?? '';
    const description = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-8').contents().first().text().trim() ?? '';
    let hentai = true;
    const arrayTags = [];
    for (const tag of $('div.tags', 'div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-8 > small:nth-child(12)').toArray()) {
        const label = $('a.badge.badge-secondary.badge-up', tag).text().trim();
        if (!label)
            continue;
        arrayTags.push({ id: label, label: label });
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
    new Error(`${$('tbody').length}`);
    if ($('tbody').length) {
        for (const chapter of $('tr', 'div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.no-padding > table.table.table-hover.table-episode > tbody').toArray()) {
            i++;
            const title = $('td > a', chapter).text().trim() ?? '';
            const chapterId = $('td > a', chapter).attr('href')?.split('/')[4] ?? '';
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
            });
            i--;
        }
    }
    else {
        const title = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-header > b').first().text().trim();
        // const date: string = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.sr-post-header > small').first().text().trim()
        chapters.push({
            id: '',
            mangaId,
            name: decodeHTMLEntity(title),
            langCode: paperback_extensions_common_1.LanguageCode.THAI,
            chapNum: 1,
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
    for (const manga of $('div.row', '#sct_content div.con div.wpm_pag.mng_lts_chp.grp').toArray()) {
        const id = $('div.det > a.ttl', manga).attr('href').split('/')[3] ?? '';
        const date = $('a > b.dte', manga).last().text().trim();
        let mangaDate = new Date();
        if (date !== 'วันนี้') {
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
const parseSearch = ($) => {
    const mangaItems = [];
    const collectedIds = [];
    for (const manga of $('#sct_content div.con div.wpm_pag.mng_lst.tbn div.nde').toArray()) {
        const id = $('div.det > a', manga).attr('href')?.split('/')[3] ?? '';
        const image = $('div.cvr > div.img_wrp > a > img', manga).first().attr('src').replace("36x0", "350x0") ?? '';
        const title = $('div.det > a', manga).text().trim() ?? '';
        const subtitle = $('div.det > div.vws', manga).text().trim() ?? '';
        if (!id || !title || !image)
            continue;
        if (collectedIds.includes(id))
            continue;
        mangaItems.push(createMangaTile({
            id,
            image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle }),
        }));
        collectedIds.push(id);
    }
    return mangaItems;
};
exports.parseSearch = parseSearch;
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
