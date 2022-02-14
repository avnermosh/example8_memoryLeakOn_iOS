import { ZipLoader } from "./static/ZipLoader.module.js";

// Setting the variable doDebugMemoryLeakOn_iOS_withRevoke to true causes a problem on iOS!!!
let doDebugMemoryLeakOn_iOS_withRevoke = true;
// doDebugMemoryLeakOn_iOS_withRevoke = false;
let dummyIndex = 5;

let toastrSettings = { timeOut: 0,
                       extendedTimeOut: 0,
                       closeButton: true,
                       closeDuration: 1000};

let zipFile = null;
let zipFileInfo = {
    zipFile: null,
    zipFileName: null,
    zipFileUrl: null,
    files: {} };

const imageCountTotal_numFilesBetweenReporting = 10;
var imageCountTotal = 0;

// --------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async function(event) { 
    await main();
});


async function extractAsBlobUrl(zipFileEntry, contentType) {

    if(doDebugMemoryLeakOn_iOS_withRevoke)
    {
        for (const filenameFullPath of Object.keys(zipFileInfo.files)) {
            let fileInfo = zipFileInfo.files[filenameFullPath];

            if(isObjectValid(fileInfo.buffer) || isObjectValid(fileInfo.url)) {

                if(isObjectValid(fileInfo.url))
                {
                    // revokeObjectURL causes a problem on iOS!!!
                    URL.revokeObjectURL(fileInfo.url);
                    fileInfo.url = null;
                    fileInfo.buffer = null;
                }
            }
            
        }
    }

    if (zipFileEntry.url) {
        return zipFileEntry.url;
    }
    
    if(isObjectInvalid(zipFileEntry.buffer)) {
        // get the buffer
        let sliceBeg = zipFileEntry.offsetInZipFile;
        let sliceEnd = sliceBeg +
            zipFileEntry.headerSize +
            zipFileEntry.compressedSize;

        let doSkipFileData = false;
        await loadFromZipFile(sliceBeg, sliceEnd, doSkipFileData, zipFileEntry.filename);
    }

    if(isObjectValid(zipFileEntry.buffer)) {
        if (isObjectValid(zipFileEntry.url)) {
            // revoke the previous zipFileEntry.url
            URL.revokeObjectURL(zipFileEntry.url);
            zipFileEntry.url = null;
        }

        let blob = new Blob([zipFileEntry.buffer], { type: contentType });
        zipFileEntry.url = URL.createObjectURL(blob);
        // after creating the blobUrl we can clear zipFileEntry.buffer
        // zipFileEntry.buffer = null;
    }
    else
    {
        throw new Error("Error from extractAsBlobUrl: Failed to read the buffer for file: " + zipFileEntry.filename);
    }
    
    return;
};


async function loadFromZipFile(sliceBeg, sliceEnd, doSkipFileData, filenameInZipFile = undefined) {
    let blobSlice = zipFile.slice(sliceBeg, sliceEnd);
    let blobSliceArrayBuffer = await blobSlice.arrayBuffer();
    
    let zipLoader = new ZipLoader();
    await ZipLoader.unzip( zipLoader, blobSliceArrayBuffer, doSkipFileData );
    if(isObjectValid(filenameInZipFile))
    {
        zipFileInfo.files[filenameInZipFile].buffer = zipLoader.files[filenameInZipFile].buffer;
    }
    
    return zipLoader;
};


function isObjectInvalid(object) {
    return !isObjectValid(object);
};


function isObjectValid(object) {
    let retval = true;
    if( (object === undefined) || (object === null))
    {
        retval = false;
    }
    return retval;
};


async function loadTheSelectedImageAndRender(zipFileEntry) {
    try
    {
        let domElement = $('#texImageId');
        domElement.attr('src', zipFileEntry.url);

        if( (imageCountTotal % imageCountTotal_numFilesBetweenReporting) == 0 )
        {
            // remove the previous toast if it exists
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

        // raise a toast to indicate the failure
        let toastTitleStr = "loadTheSelectedImageAndRender";
        let msgStr = "Failed to loadTheSelectedImageAndRender." + err;
        toastr.error(msgStr, toastTitleStr, toastrSettings);

        throw new Error(msgStr);
    }
    
    return true;
};


async function loadZipFileEntry(loopIndex, filenameFullPath) {

    let zipFileEntry = zipFileInfo.files[filenameFullPath];
    await extractAsBlobUrl(zipFileEntry, 'image/jpeg');

    let timeToSleepInMilliSecs = 100;
    await sleep(timeToSleepInMilliSecs);

    await loadTheSelectedImageAndRender(zipFileEntry);
};


async function loadZipfileHeaders_nonMobile(zipFile) {
    let zipFileUrl = URL.createObjectURL(zipFile);
    
    zipFileInfo = {
        zipFile: zipFile,
        zipFileName: zipFile.name,
        zipFileUrl: zipFileUrl,
        files: {} };
    
    // console.log('Unzip the file', zipFile.name);
    // Read the entire file to get the offsets. At this point, only read the header of the images, and skip reading the actual image data.
    let doSkipFileData = true;
    
    // MAX_BLOB_SLICE_SIZE_IN_BYTES needs to be bigger than the maximum individual file in the .zip file
    // 100 MB
    const MAX_BLOB_SLICE_SIZE_IN_BYTES = Number("1E8");
    let sliceBeg = 0;

    let numTotalBytesRead = 0;
    while(numTotalBytesRead < zipFile.size) {
        let sliceEnd = (sliceBeg + MAX_BLOB_SLICE_SIZE_IN_BYTES < zipFile.size) ?
            sliceBeg + MAX_BLOB_SLICE_SIZE_IN_BYTES :
            zipFile.size;

        let zipLoader = await loadFromZipFile(sliceBeg, sliceEnd, doSkipFileData);
        if(zipLoader.numBytesRead == 0)
        {
            // nothing was read in the last slice, i.e. we reached the last zip entry
            break;
        }

        // loop over the zipLoader.files
        // calc the absolute file offset from the relative offset
        for (const filenameFullPath of Object.keys(zipLoader.files)) {
            zipLoader.files[filenameFullPath].offsetInZipFile += sliceBeg;
            zipFileInfo.files[filenameFullPath] = zipLoader.files[filenameFullPath];
        }
        
        sliceBeg += zipLoader.numBytesRead;
        numTotalBytesRead += zipLoader.numBytesRead;
    }
};


function sleep( ms ) {
    return new Promise(res => setTimeout( res, ms ) )
};


async function main() {
    var inp = document.getElementById("inp");
    inp.oninput = async function e() {

        try
        {
            zipFile = inp.files[ 0 ];

            let texImageWrapper = $('<img id="texImageId"></img>');
            texImageWrapper.appendTo('#grid-container1');
            
            await loadZipfileHeaders_nonMobile(zipFile);

            let numLoops = 1000;
            for (let loopIndex = 0; loopIndex < numLoops; loopIndex++) {
                // console.log('loopIndex', loopIndex); 
                for (const filenameFullPath of Object.keys(zipFileInfo.files)) {
                    await loadZipFileEntry(loopIndex, filenameFullPath);
                }
            }
        }
        catch(err) {
            console.error('err', err);
            let toastTitleStr = "Error";
            let msgStr = "Failed to run the main program" + err;
            toastr.error(msgStr, toastTitleStr, toastrSettings);
        }
    }
};
