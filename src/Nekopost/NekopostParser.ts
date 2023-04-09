import {
    Chapter,
    ChapterDetails,
    Tag,
    HomeSection,
    LanguageCode,
    Manga,
    MangaStatus,
    MangaTile,
    TagSection,
} from 'paperback-extensions-common'

import { 
    MangaDetails,
    HomeData,
    ChapterImage,
} from './NekopostHelper'

import entities = require('entities')

export const parseMangaDetails = (data: MangaDetails, mangaId: string): Manga => {
    const details = data
    const titles: string[] = []

    if(details?.projectInfo.aliasName) titles.push(details?.projectInfo.aliasName.trim())
    if(details?.projectInfo.projectName) titles.push(details?.projectInfo.projectName.trim())
    const imageversion = details.projectInfo.imageVersion
    const image = `https://www.osemocphoto.com/collectManga/${mangaId}/${mangaId}_cover.jpg?${imageversion}` ?? ''
    
    const author = details.projectInfo.authorName
    const artist = details.projectInfo.artistName

    const arrayTags: Tag[] = []

    if (details?.listCate) {
        for (const category of details?.listCate) {
            const id = category?.cateLink ?? ''
            const label = category?.cateName ?? ''

            if (!id || !label) continue

            arrayTags.push({
                id,
                label
            })
        }
    }

    const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })]

    const rawStatus = details?.projectInfo.status
    let status = MangaStatus.ONGOING
    if (rawStatus == '2') status = MangaStatus.COMPLETED

    const description = details?.projectInfo.info ?? ''

    return createManga({
        id: mangaId,
        titles: titles,
        image: image,
        status: status,
        author: author,
        artist: artist,
        tags: tagSections,
        desc: description,
    })
}

export const parseChapters = (data: MangaDetails, mangaId: string): Chapter[] => {
    const details = data
    const chapters: Chapter[] = []
    let i = 0

    for (const chapter of details?.listChapter) {
        i++
        const chapterId = chapter?.chapterId ?? ''
        const chapNum = chapter?.chapterNo ? Number(chapter.chapterNo) : 0
        const date = chapter?.publishDate ? new Date(chapter?.publishDate) ?? 0 : undefined
        const title = chapter?.chapterName ? chapter?.chapterName : ''


        if (!chapterId) continue

        chapters.push({
            id: chapterId,
            mangaId,
            name: title,
            langCode: LanguageCode.THAI,
            chapNum: isNaN(chapNum) ? i : chapNum,
            time: date,
        })

        i--
    }

    return chapters.map(chapter => {
        return createChapter(chapter)
    })
}

export const parseChapterDetails = (data: ChapterImage, mangaId: string, chapterId: string): ChapterDetails => {
    const detail = data;
    const pages: string[] = []

    for (const images of detail.pageItem) {
        let page = images.pageName
        let image: string | undefined = `${page}`
        if (image && image.startsWith('/')) image = 'https:' + image
        if (image) pages.push(`https://www.osemocphoto.com/collectManga/${mangaId}/${chapterId}/${image}`)
    }

    const chapterDetails = createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages: pages,
        longStrip: false,
    })
    return chapterDetails

}

export const parseHomeSections = (data: HomeData, sectionCallback: (section: HomeSection) => void): void => {
    const details = data
    const latestSection = createHomeSection({ id: 'latest_comic', title: 'Latest Comics', view_more: true })

    const latestSection_Array: MangaTile[] = []

    for (const manga of details?.listChapter) {
        const id = manga.projectId
        const imageversion = manga.imageVersion
        const image = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageversion}`
        const title = manga.projectName
        const chapnum = manga.chapterNo
        const subtitle = `Chapter ${chapnum}`

        if (!id || !title) continue
        latestSection_Array.push(createMangaTile({
            id: id,
            image: image,
            title: createIconText({ text: decodeHTMLEntity(title) }),
            subtitleText: createIconText({ text: subtitle }),
        }))
    }
    
    latestSection.items = latestSection_Array
    sectionCallback(latestSection)

}

export const parseViewMore = (data: HomeData): MangaTile[] => {
    const comics: MangaTile[] = []
    const collectedIds: string[] = []

    for (const manga of data?.listChapter) {
        const id = manga.projectId
        const imageversion = manga.imageVersion
        const image = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageversion}`
        const title = manga.projectName
        const chapnum = manga.chapterNo
        const subtitle = `Chapter ${chapnum}`

        if (!id || !title) continue
        if (collectedIds.includes(id)) continue
        comics.push(createMangaTile({
            id,
            image: image,
            title: createIconText({ text: decodeHTMLEntity(title) }),
            subtitleText: createIconText({ text: subtitle }),
        }))
        
        collectedIds.push(id)

    }
    return comics
}

export const parseSearch = ($: CheerioStatic): MangaTile[] => {
    const mangaItems: MangaTile[] = []
    const collectedIds: string[] = []

    for (const manga of $('#sct_content div.con div.wpm_pag.mng_lst.tbn div.nde').toArray()) {
        const id = $('div.det > a', manga).attr('href')?.split('/')[3] ?? ''
        const image: string = $('div.cvr > div.img_wrp > a > img', manga).first().attr('src').replace("36x0","350x0") ?? ''
        const title: string = $('div.det > a', manga).text().trim() ?? ''
        const subtitle: string = $('div.det > div.vws', manga).text().trim() ?? ''
        if (!id || !title || !image) continue

        if (collectedIds.includes(id)) continue
        mangaItems.push(createMangaTile({
            id,
            image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle }),
        }))
        collectedIds.push(id)

    }
    return mangaItems
}

const decodeHTMLEntity = (str: string): string => {
    return entities.decodeHTML(str)
}

export interface UpdatedManga {
    ids: string[],
    loadMore: boolean;
}

export const parseUpdatedManga = ($: CheerioStatic, time: Date, ids: string[]): UpdatedManga => {
    const updatedManga: string[] = []
    let loadMore = true

    for (const manga of $('div.row', '#sct_content div.con div.wpm_pag.mng_lts_chp.grp').toArray()) {
        const id: string = $('div.det > a.ttl', manga).attr('href').split('/')[3] ?? ''
        const date = $('a > b.dte', manga).last().text().trim()
        let mangaDate = new Date()
        if (date !== 'วันนี้') {
            mangaDate = new Date(date)
        }

        if (!id || !mangaDate) continue
        if (mangaDate > time) {
            if (ids.includes(id)) {
                updatedManga.push(id)
            }
        } else {
            loadMore = false
        }
    }
    return {
        ids: updatedManga,
        loadMore,
    }
}