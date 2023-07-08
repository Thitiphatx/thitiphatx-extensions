/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
    Chapter,
    ChapterDetails,
    Tag,
    HomeSection,
    SourceManga,
    PartialSourceManga,
    TagSection,
    HomeSectionType
} from '@paperback/types'

import entities = require('entities')

export const parseMangaDetails = ($: CheerioStatic, mangaId: string): SourceManga => {
    const titles: string[] = []
    titles.push(decodeHTMLEntity($('div.container > div.row > div.col-12.col-md-9 div.card > div.card-header > b').first().text().trim()))
    const row = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row');
    let image: string = $('div.col-12.col-md-4 > img',row).attr('src') ?? 'https://i.imgur.com/GYUxEX8.png'
    const story: string = $('div.col-12.col-md-8 > p:nth-child(3) > small > a',row).text().trim() ?? ''
    const author: string = $('div.col-12.col-md-8 > p:nth-child(4) > small > a',row).text().trim() ?? ''
    const description: string = $('div.col-12.col-md-8',row).contents().first().text().trim() ?? ''

    let hentai = true
    const arrayTags: Tag[] = []
    for (const tag of $('div.tags', 'div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-8 > small:nth-child(12)').toArray()) {
        const label: string = $('a.badge.badge-secondary.badge-up', tag).text().trim()
        if (!label) continue
        arrayTags.push({ id: label, label: label })
    }
    arrayTags.push({ id: encodeURI(`${author}`), label: author })
    if (!(story.includes('ทั่วไป'))) {
        arrayTags.push({ id: encodeURI(`${story}`), label:  `เรื่อง ${story}` })
    }
    const tagSections: TagSection[] = [App.createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => App.createTag(x)) })]

    return App.createSourceManga({
        id: mangaId,
        mangaInfo: App.createMangaInfo({
            titles: titles,
            image: image,
            status: 'Ongoing',
            author: author,
            artist: author,
            tags: tagSections,
            desc: description,
            hentai: hentai,
        })
    })
}

export const parseChapters = ($: CheerioStatic, mangaId: string): Chapter[] => {
    const chapters: Chapter[] = []
    if ($('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.no-padding > table.table.table-hover.table-episode > tbody').length != 0) {
        for (const chapter of $('tr', 'div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.no-padding > table.table.table-hover.table-episode > tbody').toArray()) {
            const title: string = $('td > a', chapter).text().trim() ?? ''
            const chapterId: string = $('td > a', chapter).attr('href')?.split('/')[4] ?? ''
            const time: string = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.sr-post-header > small').text().trim()
            const date: Date = parseDate(time);
            new Error(`${title}, ${chapterId}`);
            if (!chapterId) continue
    
            const chapNum = Number(chapterId.replace("ep-", ""))
            
            if (!chapterId || !title) continue
            chapters.push(App.createChapter({
                id: chapterId,
                name: title,
                langCode: 'th',
                chapNum: isNaN(chapNum) ? 0 : chapNum,
                volume: 0,
                time: date
            }))
        } 
    } else {
        const title: string = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-header > b').first().text().trim()
        const date: string = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.sr-post-header > small').first().text().trim()
        const time: Date = parseDate(date);

        chapters.push(App.createChapter({
            id: 'null',
            name: decodeHTMLEntity(title),
            langCode: 'th',
            chapNum: 1,
            volume: 0,
            time
        }))
    }
    
    if (chapters.length == 0) {
        throw new Error(`Couldn't find any chapters for mangaId: ${mangaId}!`)
    }

    return chapters.map(chapter => {
        return App.createChapter(chapter)
    })
}

export const parseChapterDetails = ($: CheerioStatic, mangaId: string, chapterId: string): ChapterDetails => {
    const pages: string[] = []

    for (const images of $('img', '#manga-content').toArray()) {
        let image: string | undefined = $(images).attr('data-src')?.trim()
        if (image && image.startsWith('/')) image = 'https:' + image
        if (image) pages.push(image)
    }

    const chapterDetails = App.createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages: pages
    })
    return chapterDetails
}

export const parseHomeSections = ($: CheerioStatic, sectionCallback: (section: HomeSection) => void): void => {
    const latestSection = App.createHomeSection({
        id: 'latest',
        title: 'Latest Doujin',
        containsMoreItems: true,
        type: HomeSectionType.singleRowNormal
    })

    // Latest
    const latestSection_Array: PartialSourceManga[] = []
    for (const item of $('div.col-6.col-sm-4.col-md-3.mb-3.inz-col', 'div.container > div.row > div.col-sm-12.col-md-9 > div.card > div.card-body > div.row').toArray()) {
        let image: string = $('a.no-underline.inz-a > img.inz-img-thumbnail', item).first().attr('src') ?? ''

        const title: string = $('a.no-underline.inz-a > div.inz-thumbnail-title-box > div.inz-title', item).first().text().trim() ?? ''
        const id: string = $('a.no-underline.inz-a', item).attr('href').split('/')[3] ?? ''
        const subtitle: string = $('a.no-underline.inz-a > div.row.inz-detail > div.col-6.text-left > small', item).first().text().trim() ?? ''
        if (!id || !title) continue

        latestSection_Array.push(App.createPartialSourceManga({
            mangaId: id,
            image: encodeURI(image),
            title: decodeHTMLEntity(title),
            subtitle: decodeHTMLEntity(subtitle),
        }))
    }
    latestSection.items = latestSection_Array
    sectionCallback(latestSection)
}

export const parseRandomSections = (id: string, $: CheerioStatic, sectionCallback: (section: HomeSection) => void): void => {
    const randomSection = App.createHomeSection({
        id: 'random',
        title: 'Random Doujin',
        containsMoreItems: true,
        type: HomeSectionType.singleRowNormal
    })
    
    const manga_array: PartialSourceManga[] = []

    for (const item of $('div.col-6.col-sm-4.col-md-3.mb-3.inz-col', 'div.container > div.row > div.col-12.col-md-9 > div.card > div.card-body > div.row').toArray()) {
        let image: string = $('a > img', item).first().attr('src') ?? ''

        const title: string = $('a > div.inz-thumbnail-title-box > div.inz-title', item).first().text().trim() ?? ''
        const id: string = $('a', item).attr('href').split('/')[3] ?? ''
        if (!id || !title) continue
        manga_array.push(App.createPartialSourceManga({
            mangaId: id,
            image: encodeURI(image),
            title: decodeHTMLEntity(title),
        }))
    }
    randomSection.items = manga_array
    sectionCallback(randomSection)
}

export const parseViewMore = ($: CheerioStatic): PartialSourceManga[] => {
    const comics: PartialSourceManga[] = []

    for (const item of $('div.col-6.col-sm-4.col-md-3.mb-3.inz-col', 'div.container > div.row > div.col-sm-12.col-md-9 > div.card > div.card-body > div.row').toArray()) {
        let image: string = $('a.no-underline.inz-a > img.inz-img-thumbnail', item).first().attr('src') ?? ''

        const title: string = $('a.no-underline.inz-a > div.inz-thumbnail-title-box > div.inz-title', item).first().text().trim() ?? ''
        const id: string = $('a.no-underline.inz-a', item).attr('href').split('/')[3] ?? ''
        const subtitle: string = $('a.no-underline.inz-a > div.row.inz-detail > div.col-6.text-left > small', item).first().text().trim() ?? ''
        if (!id || !title) continue

        comics.push(App.createPartialSourceManga({
            mangaId: id,
            image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
            title: decodeHTMLEntity(title),
            subtitle: decodeHTMLEntity(subtitle),
        }))
    }
    return comics
}

export const parseSearch = ($: CheerioStatic, mangaId: string): PartialSourceManga[] => {
    const mangaItems: PartialSourceManga[] = []
    const collectedIds: string[] = []

    let image: string = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-4 > img').attr('src') ?? 'https://i.imgur.com/GYUxEX8.png'
    const title: string = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-header > b').first().text().trim()
    const subtitle: string = $('div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-8 > p:nth-child(4) > small > a').text().trim() ?? ''

    mangaItems.push(App.createPartialSourceManga({
        mangaId: mangaId,
        image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
        title: decodeHTMLEntity(title),
        subtitle: decodeHTMLEntity(subtitle),
    }))
    collectedIds.push(mangaId)
    return mangaItems
}

export const parseSearchtag = ($: CheerioStatic): PartialSourceManga[] => {
    const mangaItems: PartialSourceManga[] = []
    const collectedIds: string[] = []

    for (const item of $('div.col-6.col-sm-4.col-md-3.mb-3.inz-col', 'div.container > div.row > div.col-sm-12.col-md-9 > div.card > div.card-body > div.row').toArray()) {
        let image: string = $('a.no-underline.inz-a > img.inz-img-thumbnail', item).first().attr('src') ?? ''

        const title: string = $('a.no-underline.inz-a > div.inz-thumbnail-title-box > div.inz-title', item).first().text().trim() ?? ''
        const id: string = $('a.no-underline.inz-a', item).attr('href').split('/')[3] ?? ''
        const subtitle: string = $('a.no-underline.inz-a > div.row.inz-detail > div.col-6.text-left > small', item).first().text().trim() ?? ''
        if (!id || !title) continue

        if (collectedIds.includes(id)) continue

        mangaItems.push(App.createPartialSourceManga({
            mangaId: id,
            image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
            title: decodeHTMLEntity(title),
            subtitle: decodeHTMLEntity(subtitle),
        }))
        collectedIds.push(id)
    }
    return mangaItems
}

export const parseTags = ($: CheerioStatic): TagSection[] => {
    const arrayTags: Tag[] = []

    for (const tag of $('a', 'div.container > div.row > div.col-sm-12.col-md-3 div.card > div.card-body').toArray()) {
        const label = $(tag).text().trim()
        const id = $(tag).attr('href')?.split("/")[4] ?? ''
        if (!id || !label) continue
        arrayTags.push({ id: id, label: label })
    }
    
    const tagSections: TagSection[] = [App.createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => App.createTag(x)) })]
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

const decodeHTMLEntity = (str: string): string => {
    return entities.decodeHTML(str)
}