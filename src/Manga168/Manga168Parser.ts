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
    for (const title of $('div.seriestucon > div.seriestuheader > div.seriestualt').text().trim().split(', ')) {
        titles.push(decodeHTMLEntity(title))
    }
    
    let image: string = encodeURI($('div.seriestucon > div.seriestucontent > div.seriestucontl > div.thumb > img').attr('src')) ?? 'https://i.imgur.com/GYUxEX8.png'
    const description: string = decodeHTMLEntity($('div.seriestucon > div.seriestucontent > div.seriestucontentr > div.seriestuhead > div.entry-content.entry-content-single > p:nth-child(1)').text().trim() ?? '')
    const infomation = $('div.seriestucon > div.seriestucontent > div.seriestucontentr > div.seriestucont > div.seriestucontr > table.infotable > tbody').text()
    const author: string = parseInfo(infomation, 'Author')
    const artist: string = parseInfo(infomation, 'Artist')
    const rawStatus: string = parseInfo(infomation, 'สถานะ')

    const arrayTags: Tag[] = []
    for (const tag of $('a', 'div.seriestucon > div.seriestucontent > div.seriestucontentr > div.seriestucont > div.seriestucontr > div.seriestugenre').toArray()) {
        const label: string = $(tag).text().trim()
        const id: string = $(tag).attr('href').split('/')[4] ?? label

        if (!label) continue
        arrayTags.push({ id: id, label: label })
    }
    const tagSections: TagSection[] = [App.createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => App.createTag(x)) })]

    let status = 'ONGOING'
    switch (rawStatus.toUpperCase()) {
        case 'ONGOING':
            status = 'Ongoing'
            break
        case 'COMPLETED':
            status = 'Completed'
            break
        default:
            status = 'Ongoing'
            break
    }

    return App.createSourceManga({
        id: mangaId,
        mangaInfo: App.createMangaInfo({
            titles: titles,
            image: image,
            status: status,
            author: author,
            artist: artist,
            tags: tagSections,
            desc: description,
        })
    })
}

export const parseChapters = ($: CheerioStatic, mangaId: string): Chapter[] => {
    const chapters: Chapter[] = []

    for (const chapter of $('li', '#chapterlist > ul.clstyle').toArray()) {
        const title: string = $('div.chbox > div.eph-num > a > span.chapternum', chapter).text().trim() ?? ''
        const chapterId: string = $('div.chbox > div.eph-num > a', chapter).attr('href')?.split('/')[3] ?? ''

        if (!chapterId) continue

        const chapNum = Number($(chapter).attr('data-num'))
        const time = $('div > div > a > span.chapterdate', chapter).text().trim()
        const date: Date = parseDate(time)

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
    if (chapters.length == 0) {
        throw new Error(`Couldn't find any chapters for mangaId: ${mangaId}!`)
    }

    return chapters.map(chapter => {
        return App.createChapter(chapter)
    })
}

export const parseChapterDetails = ($: CheerioStatic, mangaId: string, chapterId: string): ChapterDetails => {
    const pages: string[] = []

    for (const images of $('#readerarea').text().trim().split('<br />')) {

        let image: string | undefined = parseInfo(images, 'src=').replaceAll('"', '').split(' ')[0]
        if (image && image.startsWith('/')) image = 'https:' + image
        if (image) pages.push(encodeURI(image))
    }

    const chapterDetails = App.createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages: pages
    })
    return chapterDetails
}

export const parseHomeSections = ($: CheerioStatic, sectionCallback: (section: HomeSection) => void): void => {
    const popularSection = App.createHomeSection({
        id: 'popular',
        title: 'Most Popular',
        containsMoreItems: false,
        type: HomeSectionType.singleRowLarge
    })

    const latestSection = App.createHomeSection({
        id: 'latest',
        title: 'Latest Manga',
        containsMoreItems: true,
        type: HomeSectionType.singleRowNormal
    })

    const weeklySection = App.createHomeSection({
        id: 'weekly',
        title: 'Weekly Popular',
        containsMoreItems: false,
        type: HomeSectionType.singleRowNormal
    })

    const monthlySection = App.createHomeSection({
        id: 'monthly',
        title: 'Monthly Popular',
        containsMoreItems: false,
        type: HomeSectionType.singleRowNormal
    })

    // Popular Section
    const popularSection_Array: PartialSourceManga[] = []
    for (const comic of $('li', '#wpop-items > div.serieslist.pop.wpop.wpop-alltime > ul').toArray()) {
        const image: string = $('div.imgseries > a > img', comic).first().attr('src') ?? ''
        const title: string = $('div.leftseries > h3 > a.series', comic).text() ?? ''
        const id: string = $('div.leftseries > h3 > a.series', comic).attr('href').split('/')[4] ?? ''
        if (!id || !title) continue

        popularSection_Array.push(App.createPartialSourceManga({
            mangaId: id,
            image: encodeURI(image),
            title: decodeHTMLEntity(title),
        }))
    }
    popularSection.items = popularSection_Array
    sectionCallback(popularSection)

    // Latest
    const latestSection_Array: PartialSourceManga[] = []
    for (const comic of $('div.utao.styletwo > div.uta', '#content > div.wrapper > div.postbody > div.bixbox > div.listupd').toArray()) {
        let image: string = $('div.imgu > a.series > img', comic).first().attr('src') ?? ''

        const title: string = $('div.luf > a.series', comic).first().attr('title') ?? ''
        const id: string = $('div.luf > a.series', comic).attr('href').split('/')[4] ?? ''
        const subtitle: string = $('div.luf > ul > li:nth-child(1) > a', comic).text() ?? ''
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

    // Weekly Section
    const weeklySection_Array: PartialSourceManga[] = []
    for (const comic of $('li', '#wpop-items > div.serieslist.pop.wpop.wpop-weekly > ul').toArray()) {
        const image: string = $('div.imgseries > a > img', comic).first().attr('src') ?? ''
        const title: string = $('div.leftseries > h3 > a.series', comic).text() ?? ''
        const id: string = $('div.leftseries > h3 > a.series', comic).attr('href').split('/')[4] ?? ''
        if (!id || !title) continue

        weeklySection_Array.push(App.createPartialSourceManga({
            mangaId: id,
            image: encodeURI(image),
            title: decodeHTMLEntity(title),
        }))
    }
    weeklySection.items = weeklySection_Array
    sectionCallback(weeklySection)

   // Monthly Section
   const monthlySection_Array: PartialSourceManga[] = []
   for (const comic of $('li', '#wpop-items > div.serieslist.pop.wpop.wpop-monthly > ul').toArray()) {
       const image: string = $('div.imgseries > a > img', comic).first().attr('src') ?? ''
       const title: string = $('div.leftseries > h3 > a.series', comic).text() ?? ''
       const id: string = $('div.leftseries > h3 > a.series', comic).attr('href').split('/')[4] ?? ''
       if (!id || !title) continue

       monthlySection_Array.push(App.createPartialSourceManga({
           mangaId: id,
           image: encodeURI(image),
           title: decodeHTMLEntity(title),
       }))
   }
   monthlySection.items = monthlySection_Array
   sectionCallback(monthlySection)
}

export const parseViewMore = ($: CheerioStatic): PartialSourceManga[] => {
    const comics: PartialSourceManga[] = []

    for (const item of $('div.col-lg-3.col-md-3.col-sm-4.col-smx-4.col-xs-6 > div.aniframe', 'div.container').toArray()) {
        let image: string = encodeURI($('a:nth-child(2) > img', item).first().attr('src')) ?? ''

        const title: string = $('a.manga-title', item).first().text().trim() ?? ''
        const id: string = $('a.manga-title', item).attr('href').split('/')[3] ?? ''
        const sub: string[] = $('span.label-update.label.label-default.label-ago', item).first().text().trim().split(' ') ?? ''
        const subtitle: string = `${sub[0]} ${sub[1]}${sub[2]}` ?? ''

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

export const parseSearch = ($: CheerioStatic): PartialSourceManga[] => {
    const mangaItems: PartialSourceManga[] = []
    const collectedIds: string[] = []

    for (const manga of $('div.bs', '#content > div.wrapper > div.postbody > div.bixbox > div.listupd').toArray()) {
        let image: string = encodeURI($('div.bsx > a > div.limit > img', manga).first().attr('src')) ?? ''

        const title: string = $('div.bsx > a > div.bigor > div.tt', manga).first().text().trim() ?? ''
        const id: string = $('div.bsx > a', manga).attr('href').split('/')[4] ?? ''
        const subtitle: string = $('div.bsx > a > div.bigor > div.adds > div.epxs', manga).first().text().trim() ?? ''
        
        if (!id || !title || !image) continue

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

    for (const tag of $('li', '#sidebar > div.section > ul.genre').toArray()) {
        const label = $('a',tag).text().trim()
        const id = $('a',tag).attr('href')?.split("/")[4] ?? ''
        if (!id || !label) continue
        arrayTags.push({ id: id, label: label })
    }
    
    const tagSections: TagSection[] = [App.createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => App.createTag(x)) })]
    return tagSections
}

const parseInfo = (info: string, label: string): string => {
    let data: string = ''
    let index = info.indexOf(label);

    if (index !== -1) {
        data = info.substr(index + label.length).trim().split('\n')[0] ?? '';
    }

    return data
}

const parseDate = (date: string): Date => {
    const monthMap: {[key: string]: string } = {
        'มกราคม': 'January',
        'กุมภาพันธ์': 'February',
        'มีนาคม': 'March',
        'เมษายน': 'April',
        'พฤษภาคม': 'May',
        'มิถุนายน': 'June',
        'กรกฎาคม': 'July',
        'สิงหาคม': 'August',
        'กันยายน': 'September',
        'ตุลาคม': 'October',
        'พฤศจิกายน': 'November',
        'ธันวาคม': 'December'
    }

    const THmonth: string = date.split(' ')[0] ?? ''
    const day: string = date.split(' ')[1] ?? ''
    const year: string = date.split(' ')[2] ?? ''

    const month = monthMap[THmonth];
    const time = new Date(`${month} ${day} ${year}`)

    return time
}

export const isLastPage = ($: CheerioStatic): boolean => {
    let isLast = false
    const pages = []
    for (const page of $('a.page-numbers', '#content > div.wrapper > div.postbody > div.bixbox > div.listupd > div.pagination').toArray()) {
        const p = Number($(page).text().trim())
        if (isNaN(p)) continue
        pages.push(p)
    }
    const lastPage = Math.max(...pages)
    const currentPage = Number($('#content > div.wrapper > div.postbody > div.bixbox > div.listupd > div.pagination > span').text().trim())
    if (currentPage >= lastPage) isLast = true
    return isLast
}

const decodeHTMLEntity = (str: string): string => {
    return entities.decodeHTML(str)
}