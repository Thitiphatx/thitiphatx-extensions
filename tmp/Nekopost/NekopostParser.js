"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSearch = exports.parseViewMore = exports.parseHomeSections = exports.parseChapterDetails = exports.parseChapters = exports.parseMangaDetails = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const entities = require("entities");
const parseMangaDetails = (data, mangaId) => {
    const details = data;
    const titles = [];
    if (details?.projectInfo.aliasName)
        titles.push(details?.projectInfo.aliasName.trim());
    if (details?.projectInfo.projectName)
        titles.push(details?.projectInfo.projectName.trim());
    const imageversion = details.projectInfo.imageVersion;
    const image = `https://www.osemocphoto.com/collectManga/${mangaId}/${mangaId}_cover.jpg?${imageversion}` ?? '';
    const author = details.projectInfo.authorName;
    const artist = details.projectInfo.artistName;
    const arrayTags = [];
    if (details?.listCate) {
        for (const category of details?.listCate) {
            const id = category?.cateLink ?? '';
            const label = category?.cateName ?? '';
            if (!id || !label)
                continue;
            arrayTags.push({
                id,
                label
            });
        }
    }
    const tagSections = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })];
    const rawStatus = details?.projectInfo.status;
    let status = paperback_extensions_common_1.MangaStatus.ONGOING;
    if (rawStatus == '2')
        status = paperback_extensions_common_1.MangaStatus.COMPLETED;
    const description = details?.projectInfo.info ?? '';
    return createManga({
        id: mangaId,
        titles: titles,
        image: image,
        status: status,
        author: author,
        artist: artist,
        tags: tagSections,
        desc: description,
    });
};
exports.parseMangaDetails = parseMangaDetails;
const parseChapters = (data, mangaId) => {
    const details = data;
    const chapters = [];
    let sortingIndex = 0;
    for (const chapter of details?.listChapter) {
        const id = chapter?.chapterNo ?? '';
        const chapNum = chapter?.chapterNo ? Number(chapter.chapterNo) : 0;
        const time = chapter?.publishDate ? new Date(chapter?.publishDate) ?? 0 : undefined;
        const name = chapter?.chapterName ? chapter?.chapterName : '';
        if (!id)
            continue;
        chapters.push(createChapter({
            id: `${id}`,
            mangaId,
            name,
            chapNum: chapNum ? chapNum : 0,
            time: time,
            langCode: paperback_extensions_common_1.LanguageCode.THAI,
            // @ts-ignore
            sortingIndex
        }));
        sortingIndex--;
    }
    return chapters;
};
exports.parseChapters = parseChapters;
const parseChapterDetails = (data) => {
    const detail = data;
    const chapId = detail.chapterId;
    const projId = detail.projectId;
    const pages = [];
    for (const images of detail.pageItem) {
        let page = images.pageName;
        let image = `https://www.osemocphoto.com/collectManga/${projId}/${chapId}/${page}`;
        if (image)
            pages.push(image);
    }
    const chapterDetails = createChapterDetails({
        id: chapId,
        mangaId: projId,
        pages: pages,
        longStrip: false,
    });
    return chapterDetails;
};
exports.parseChapterDetails = parseChapterDetails;
const parseHomeSections = (data, sectionCallback) => {
    const details = data;
    const latestSection = createHomeSection({ id: 'latest_comic', title: 'Latest Comics', view_more: true });
    const latestSection_Array = [];
    for (const manga of details?.listChapter) {
        const id = manga.projectId;
        const imageversion = manga.imageVersion;
        const image = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageversion}`;
        const title = manga.projectName;
        const chapnum = manga.chapterNo;
        const subtitle = `Chapter ${chapnum}`;
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
const parseViewMore = (data) => {
    const comics = [];
    const collectedIds = [];
    for (const manga of data?.listChapter) {
        const id = manga.projectId;
        const imageversion = manga.imageVersion;
        const image = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageversion}`;
        const title = manga.projectName;
        const chapnum = manga.chapterNo;
        const subtitle = `Chapter ${chapnum}`;
        if (!id || !title)
            continue;
        if (collectedIds.includes(id))
            continue;
        comics.push(createMangaTile({
            id,
            image: image,
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
