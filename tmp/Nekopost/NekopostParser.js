"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSearch = exports.parseViewMore = exports.parseHomeSections = exports.parseUpdatedManga = exports.parseChapterDetails = exports.parseChapters = exports.parseMangaDetails = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const entities = require("entities");
const parseMangaDetails = (data, mangaId) => {
    const manga = data;
    const titles = [];
    const id = manga.projectInfo.projectId ?? '';
    const projectName = manga.projectInfo.projectName ?? '';
    const alias = manga.projectInfo.aliasName ?? '';
    titles.push(projectName);
    titles.push(alias);
    let imageVersion = manga.projectInfo.imageVersion ?? '';
    let image = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? '';
    const author = manga.projectInfo.authorName ?? '';
    const artist = manga.projectInfo.artistName ?? '';
    const info = manga.projectInfo.info ?? '';
    let hentai = false;
    const arrayTags = [];
    for (const tag of manga.listCate) {
        const label = tag.cateName ?? '';
        const id = tag.cateCode ?? '';
        if (!id || !label)
            continue;
        if (manga.projectInfo.flgMature)
            hentai = true;
        arrayTags.push({ id: id, label: label });
    }
    const tagSections = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })];
    const rawStatus = manga.projectInfo.status ?? '';
    let status = paperback_extensions_common_1.MangaStatus.ONGOING;
    if (rawStatus == '0')
        status = paperback_extensions_common_1.MangaStatus.COMPLETED;
    return createManga({
        id: mangaId,
        titles: titles,
        image: image,
        hentai: hentai,
        status: status,
        author: author,
        artist: artist,
        tags: tagSections,
        desc: info,
    });
};
exports.parseMangaDetails = parseMangaDetails;
const parseChapters = (data, mangaId) => {
    const chapters = [];
    let i = 0;
    for (const chapter of data.listChapter) {
        i++;
        const title = chapter.chapterName ?? '';
        const chapterId = chapter.chapterId ?? '';
        if (!chapterId)
            continue;
        const chapNum = Number(chapter.chapterNo); //We're manually setting the chapters regarless, however usually the ID equals the chapter number.
        const date = new Date(chapter.publishDate);
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
const parseChapterDetails = (data, mangaId, chapterId) => {
    const pages = [];
    for (const images of data.pageItem) {
        let file = images.pageName;
        let image = `https://www.osemocphoto.com/collectManga/${mangaId}/${chapterId}/${images.pageName}`;
        console.log(image);
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
const parseUpdatedManga = (data, time, ids) => {
    const updatedManga = [];
    let loadMore = true;
    for (const manga of data.listChapter) {
        const id = manga.projectId ?? '';
        const date = manga.createDate;
        const mangaDate = new Date(date);
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
const parseHomeSections = (data, sectionCallback) => {
    const latestSection = createHomeSection({ id: 'latest_comic', title: 'Latest Mangas', view_more: true });
    const latestSection_Array = [];
    for (const manga of data.listChapter) {
        const id = manga.projectId ?? '';
        let imageVersion = manga.imageVersion ?? '';
        let image = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? '';
        const title = manga.projectName ?? '';
        const subtitle = `Ch.${manga.chapterNo} ${manga.chapterName}` ?? '';
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
    for (const manga of data.listChapter) {
        const id = manga.projectId ?? '';
        let imageVersion = manga.imageVersion ?? '';
        let image = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? '';
        const title = manga.projectName ?? '';
        const subtitle = `Ch.${manga.chapterNo} ${manga.chapterName}` ?? '';
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
const parseSearch = (data) => {
    const mangaItems = [];
    const collectedIds = [];
    for (const manga of data.listProject) {
        const id = manga.projectId ?? '';
        let imageVersion = manga.imageVersion ?? '';
        let image = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? '';
        const title = manga.projectName ?? '';
        const subtitle = `Ch.${manga.noChapter}` ?? '';
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
