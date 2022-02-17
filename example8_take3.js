
// Setting the variable doDebugMemoryLeakOn_iOS_withRevoke to true causes a problem on iOS!!!
let doDebugMemoryLeakOn_iOS_withRevoke = true;
// doDebugMemoryLeakOn_iOS_withRevoke = false;
let dummyIndex = 5;

let toastrSettings = { timeOut: 0,
                       extendedTimeOut: 0,
                       closeButton: true,
                       closeDuration: 1000};

let filesInfo = {
    'IMG_20191023_090718.jpg': { filename: "IMG_20191023_090718.jpg",
                                 buffer: null,
                                 urlRef: "https://local.bldlog.com/avner/img/369/429/IMG_20191023_090718.jpg",
                                 url: null },
    'IMG_20191126_155204.jpg': { filename: "IMG_20191126_155204.jpg",
                                 buffer: null,
                                 urlRef: "https://local.bldlog.com/avner/img/369/429/IMG_20191126_155204.jpg",
                                 url: null },
    'IMG_20191126_155221.jpg': { filename: "IMG_20191126_155221.jpg",
                                 buffer: null,
                                 urlRef: "https://local.bldlog.com/avner/img/369/429/IMG_20191126_155221.jpg",
                                 url: null }
};

const imageCountTotal_numFilesBetweenReporting = 10;
var imageCountTotal = 0;

// --------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async function(event) { 
    await main();
});


async function extractAsBlobUrl(fileEntry, contentType) {

    if(doDebugMemoryLeakOn_iOS_withRevoke)
    {
        for (const filenameFullPath of Object.keys(filesInfo)) {
            let fileInfo = filesInfo[filenameFullPath];

            if(isObjectValid(fileInfo.buffer) || isObjectValid(fileInfo.url)) {

                if(isObjectValid(fileInfo.url))
                {
                    // revokeObjectURL causes a problem on iOS!!!
                    // console.log('filesInfo[filenameFullPath].url1', filesInfo[filenameFullPath].url);
                    // console.log('fileInfo.url1', fileInfo.url); 
                    URL.revokeObjectURL(fileInfo.url);
                    fileInfo.url = null;
                    // console.log('fileInfo.url2', fileInfo.url); 
                    // console.log('filesInfo[filenameFullPath].url2', filesInfo[filenameFullPath].url); 
                    
                    fileInfo.buffer = null;
                }
            }
            
        }
    }

    if (fileEntry.url) {
        return fileEntry.url;
    }
    
    if(!isObjectValid(fileEntry.buffer)) {
        // get the buffer
        await loadImageFile(fileEntry);
    }

    if(isObjectValid(fileEntry.buffer)) {
        if (isObjectValid(fileEntry.url)) {
            // revoke the previous fileEntry.url
            URL.revokeObjectURL(fileEntry.url);
            fileEntry.url = null;
        }

        let blob = new Blob([fileEntry.buffer], { type: contentType });
        fileEntry.url = URL.createObjectURL(blob);
    }
    else
    {
        throw new Error("Error from extractAsBlobUrl: Failed to read the buffer for file: " + fileEntry.filename);
    }
    
    return;
};


async function loadImageFile(fileEntry) {
    let url = fileEntry.urlRef;
    let blob = await fetch(url).then(r => r.blob());
    fileEntry.buffer = await blob.arrayBuffer();
    
    return;
};


function isObjectValid(object) {
    if( (object === undefined) || (object === null))
    {
        return false;
    }
    return true;
};


async function loadTheSelectedImageAndRender(fileEntry) {
    try
    {
        let domElement = $('#texImageId');
        domElement.attr('src', fileEntry.url);

        if( (imageCountTotal % imageCountTotal_numFilesBetweenReporting) == 0 )
        {
            toastr.clear();

            let toastTitleStr = "Image counter";
            if(doDebugMemoryLeakOn_iOS_withRevoke)
            {
                toastTitleStr = "Image counter - with revoke" + dummyIndex;
            }
            else
            {
                toastTitleStr = "Image counter - WITHOUT___revoke" + dummyIndex;
            }
            let msgStr = "imageCountTotal: " + imageCountTotal;

            toastr.success(msgStr, toastTitleStr, toastrSettings);
        }
        imageCountTotal++;
    }
    catch(err) {
        console.error('err', err);

        let toastTitleStr = "loadTheSelectedImageAndRender";
        let msgStr = "Failed to loadTheSelectedImageAndRender." + err;
        toastr.error(msgStr, toastTitleStr, toastrSettings);

        throw new Error(msgStr);
    }
    
    return true;
};


async function loadFileEntry(loopIndex, filenameFullPath) {

    let fileEntry = filesInfo[filenameFullPath];
    await extractAsBlobUrl(fileEntry, 'image/jpeg');

    let timeToSleepInMilliSecs = 100;
    await sleep(timeToSleepInMilliSecs);

    await loadTheSelectedImageAndRender(fileEntry);
};


function sleep( ms ) {
    return new Promise(res => setTimeout( res, ms ) )
};


async function main() {
    try
    {
        let texImageWrapper = $('<img id="texImageId"></img>');
        texImageWrapper.appendTo('#grid-container1');
        
        let numLoops = 1000;
        for (let loopIndex = 0; loopIndex < numLoops; loopIndex++) {
            // console.log('loopIndex', loopIndex); 
            for (const filenameFullPath of Object.keys(filesInfo)) {
                await loadFileEntry(loopIndex, filenameFullPath);
            }
        }
    }
    catch(err) {
        console.error('err', err);
        let toastTitleStr = "Error";
        let msgStr = "Failed to run the main program" + err;
        toastr.error(msgStr, toastTitleStr, toastrSettings);
    }
};
