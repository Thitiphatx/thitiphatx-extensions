import {
    Chapter,
    ChapterDetails,
    Tag,
    HomeSection,
    LanguageCode,
    Manga,
    MangaStatus,
    MangaTile,
    TagSection
} from 'paperback-extensions-common'

import entities = require('entities')

export const parseMangaDetails = ($: CheerioStatic, mangaId: string): Manga => {

    const titles: string[] = []
    titles.push(decodeHTMLEntity($('div.container > div.row > div.col-12.col-md-9 div.card > div.card-header > b').first().text().trim()))

    let image: string = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-4 > img').attr('src') ?? 'https://i.imgur.com/GYUxEX8.png'

    const author: string = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-8 > p:nth-child(4) > small > a').text().trim() ?? ''
    const description: string = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-8').contents().first().text().trim() ?? ''

    let hentai = true
    const arrayTags: Tag[] = []
    for (const tag of $('div.tags', 'div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-8 > small:nth-child(12)').toArray()) {
        const label: string = $('a.badge.badge-secondary.badge-up', tag).text().trim()

        if (!label) continue
        arrayTags.push({ id: label, label: label })
    }
    const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })]

    return createManga({
        id: mangaId,
        titles: titles,
        image: image,
        hentai: hentai,
        status: MangaStatus.ONGOING,
        author: author,
        artist: author,
        tags: tagSections,
        desc: description,

    })
}

export const parseChapters = ($: CheerioStatic, mangaId: string): Chapter[] => {
    const chapters: Chapter[] = []
    let i = 0

    if ($('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.no-padding > table.table.table-hover.table-episode > tbody').length != 0) {
        for (const chapter of $('tr', 'div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.no-padding > table.table.table-hover.table-episode > tbody').toArray()) {
            i++
            const title: string = $('td > a', chapter).text().trim() ?? ''
            const chapterId: string = $('td > a', chapter).attr('href')?.split('/')[4] ?? ''
            const time: string = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.sr-post-header > small').text().trim()
            const date: Date = parseDate(time);
            new Error(`${title}, ${chapterId}`);
            if (!chapterId) continue
    
            const chapNum = Number(chapterId.replace("ep-", ""))
            
            if (!chapterId || !title) continue
    
            chapters.push({
                id: chapterId,
                mangaId,
                name: decodeHTMLEntity(title),
                langCode: LanguageCode.THAI,
                chapNum: isNaN(chapNum) ? i : chapNum,
                time: date
            })
    
            i--
    
        }
    }
    else {
        const title: string = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-header > b').first().text().trim()
        const date: string = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.sr-post-header > small').first().text().trim()
        const time: Date = parseDate(date);
        chapters.push({
            id: 'null',
            mangaId,
            name: decodeHTMLEntity(title),
            langCode: LanguageCode.THAI,
            chapNum: 1,
            time: time
        })
    }
    return chapters.map(chapter => {
        return createChapter(chapter)
    })
}

export const parseChapterDetails = ($: CheerioStatic, mangaId: string, chapterId: string): ChapterDetails => {
    const pages: string[] = []

    for (const images of $('img', '#manga-content').toArray()) {
        let image: string | undefined = $(images).attr('data-src')?.trim()
        if (image && image.startsWith('/')) image = 'https:' + image
        if (image) pages.push(image)
    }

    const chapterDetails = createChapterDetails({
        id: chapterId,
        mangaId,
        pages: pages,
        longStrip: false,
    })
    return chapterDetails
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

export const parseHomeSections = ($: CheerioStatic, sectionCallback: (section: HomeSection) => void): void => {
    const latestSection = createHomeSection({ id: 'latest_doujin', title: 'Latest Doujin', view_more: true })

    const latestSection_Array: MangaTile[] = []

    for (const item of $('div.col-6.col-sm-4.col-md-3.mb-3.inz-col', 'div.container > div.row > div.col-sm-12.col-md-9 > div.card > div.card-body > div.row').toArray()) {
        let image: string = $('a.no-underline.inz-a > img.inz-img-thumbnail', item).first().attr('src') ?? ''

        const title: string = $('a.no-underline.inz-a > div.inz-thumbnail-title-box > div.inz-title', item).first().text().trim() ?? ''
        const id: string = $('a.no-underline.inz-a', item).attr('href').split('/')[3] ?? ''
        const subtitle: string = $('a.no-underline.inz-a > div.row.inz-detail > div.col-6.text-left > small', item).first().text().trim() ?? ''
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

export const parseViewMore = ($: CheerioStatic): MangaTile[] => {
    const comics: MangaTile[] = []
    const collectedIds: string[] = []

    for (const item of $('div.col-6.col-sm-4.col-md-3.mb-3.inz-col', 'div.container > div.row > div.col-sm-12.col-md-9 > div.card > div.card-body > div.row').toArray()) {
        let image: string = $('a.no-underline.inz-a > img.inz-img-thumbnail', item).first().attr('src') ?? ''

        const title: string = $('a.no-underline.inz-a > div.inz-thumbnail-title-box > div.inz-title', item).first().text().trim() ?? ''
        const id: string = $('a.no-underline.inz-a', item).attr('href').split('/')[3] ?? ''
        const subtitle: string = $('a.no-underline.inz-a > div.row.inz-detail > div.col-6.text-left > small', item).first().text().trim() ?? ''
        if (!id || !title) continue

        if (collectedIds.includes(id)) continue
        comics.push(createMangaTile({
            id,
            image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
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

    for (const item of $('div.col-6.col-sm-4.col-md-3.mb-3.inz-col', 'div.container > div.row > div.col-sm-12.col-md-9 > div.card > div.card-body > div.row').toArray()) {
        let image: string = $('a.no-underline.inz-a > img.inz-img-thumbnail', item).first().attr('src') ?? ''

        const title: string = $('a.no-underline.inz-a > div.inz-thumbnail-title-box > div.inz-title', item).first().text().trim() ?? ''
        const id: string = $('a.no-underline.inz-a', item).attr('href').split('/')[3] ?? ''
        const subtitle: string = $('a.no-underline.inz-a > div.row.inz-detail > div.col-6.text-left > small', item).first().text().trim() ?? ''
        if (!id || !title) continue

        if (collectedIds.includes(id)) continue
        mangaItems.push(createMangaTile({
            id,
            image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
            title: createIconText({ text: decodeHTMLEntity(title) }),
            subtitleText: createIconText({ text: subtitle }),
        }))
        collectedIds.push(id)

    }
    return mangaItems
}

const decodeHTMLEntity = (str: string): string => {
    return entities.decodeHTML(str)
}

export const isLastPage = ($: CheerioStatic): boolean => {
    let isLast = false
    const pages = []
    for (const page of $('option', 'div.container > div.row > div.col-sm-12.col-md-9 > div.row.mb-3 > div.col-md-8.col-4 > select').toArray()) {
        const p = Number($(page).text().trim())
        if (isNaN(p)) continue
        pages.push(p)
    }
    const lastPage = Math.max(...pages)
    const currentPage = Number($('div.container > div.row > div.col-sm-12.col-md-9 > div.row.mb-3 > div.col-md-8.col-4 > select').val())
    if (currentPage >= lastPage) isLast = true
    return isLast
}

export const parseTags = ($: CheerioStatic): TagSection[] | null => {
    const arrayTags: Tag[] = []

    for (const tag of $('a', 'div.container > div.row > div.col-sm-12.col-md-3 div.card > div.card-body').toArray()) {
        const label = $(tag).text().trim()
        const id = $(tag).attr('href')?.split("/")[4] ?? ''
        if (!id || !label) continue
        arrayTags.push({ id: id, label: label })
    }
    
    const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })]
    console.log(tagSections)
    return tagSections
}

const parseDate = (date: string): Date => {
    let time: Date
    const number = Number(date.replace(/[^0-9]/g, ''))
    if (date.includes('LESS THAN AN HOUR') || date.includes('JUST NOW')) {
        time = new Date(Date.now())
    } else if (date.includes('ปี') || date.includes('YEARS')) {
        time = new Date(Date.now() - (number * 31556952000))
    } else if (date.includes('เดือน') || date.includes('MONTHS')) {
        time = new Date(Date.now() - (number * 2592000000))
    } else if (date.includes('สัปดาห์') || date.includes('WEEKS')) {
        time = new Date(Date.now() - (number * 604800000))
    } else if (date.includes('YESTERDAY')) {
        time = new Date(Date.now() - 86400000)
    } else if (date.includes('วัน') || date.includes('DAYS')) {
        time = new Date(Date.now() - (number * 86400000))
    } else if (date.includes('ชั่วโมง') || date.includes('HOURS')) {
        time = new Date(Date.now() - (number * 3600000))
    } else if (date.includes('นาที') || date.includes('MINUTES')) {
        time = new Date(Date.now() - (number * 60000))
    } else if (date.includes('วินาที') || date.includes('SECONDS')) {
        time = new Date(Date.now() - (number * 1000))
    } else {
        const split = date.split('-')
        time = new Date(Number(split[2]), Number(split[0]) - 1, Number(split[1]))
    }
    return time
}