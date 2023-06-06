"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTags = exports.isLastPage = exports.parseSearch = exports.parseViewMore = exports.parseHomeSections = exports.parseUpdatedManga = exports.parseChapterDetails = exports.parseChapters = exports.parseMangaDetails = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const entities = require("entities");
const parseMangaDetails = ($, mangaId) => {
    const titles = [];
    titles.push(decodeHTMLEntity($('div.wpm_pag.mng_det > h1').first().text().trim()));
    let image = $('img', 'div.cvr_ara').attr('src') ?? 'https://i.imgur.com/GYUxEX8.png';
    if (image.startsWith('/'))
        image = 'https:' + image;
    const author = $('div.det > p:nth-child(7) > a').text().trim() ?? '';
    const description = decodeHTMLEntity($('div.det > p:nth-child(3)').text().trim() ?? '');
    let hentai = false;
    const arrayTags = [];
    for (const tag of $('a', '#sct_content > div > div.wpm_pag.mng_det > div.mng_ifo > div.det > p:nth-child(9)').toArray()) {
        const label = $(tag).text().trim();
        const id = encodeURI($(tag).attr('href')?.split("/")[5] ?? '');
        if (!label || !id)
            continue;
        if (label.includes('hotlink'))
            break;
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
        desc: description,
        tags: tagSections,
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
    const latestSection = createHomeSection({ id: 'latest_comic', title: 'Latest Manga', view_more: true });
    const latestSection_Array = [];
    for (const manga of $('div.row', '#sct_content div.con div.wpm_pag.mng_lts_chp.grp').toArray()) {
        const id = $('div.det > a.ttl', manga).attr('href').split('/')[3] ?? '';
        const image = encodeURI($('div.cvr > div.img_wrp > a > img', manga).first().attr('src').replace("36x0", "350x0")) ?? '';
        const title = $('div.det > a', manga).text().trim() ?? '';
        const subtitle = $('ul.lst > li:nth-child(1) > a.lst > b.val.lng_', manga).text().trim() ?? '';
        if (!id || !title)
            continue;
        latestSection_Array.push(createMangaTile({
            id,
            image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
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
    for (const manga of $('#sct_content > div.con > div.wpm_pag.mng_lts_chp.grp > div.row').toArray()) {
        const id = $('div.det > a', manga).attr('href')?.split('/')[3] ?? '';
        const image = encodeURI($('div.cvr > div.img_wrp > a > img', manga).first().attr('src').replace("36x0", "350x0")) ?? '';
        const title = $('div.det > a', manga).text().trim() ?? '';
        const subtitle = $('div.det > ul.lst > li:nth-child(1) > a.lst > b.val.lng_', manga).text().trim() ?? '';
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
        const image = encodeURI($('div.cvr > div.img_wrp > a > img', manga).first().attr('src').replace("36x0", "350x0")) ?? '';
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
const parseTags = ($) => {
    const arrayTags = [];
    for (const tag of $('li', '#wpm_wgt_mng_idx_2_tab_cat > ul').toArray()) {
        const label = $(tag).text().trim();
        const id = encodeURI($('a', tag).attr('href')?.split("/")[5] ?? '');
        if (!id || !label)
            continue;
        if (label.includes('hotlink'))
            break;
        arrayTags.push({ id: id, label: label });
    }
    const tagSections = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })];
    return tagSections;
};
exports.parseTags = parseTags;
