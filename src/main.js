var g_Editor = null;
var g_Song = null;
var g_Synth = null;

var g_MainTabIndex = 0;
var g_CurrentKey = null;
var g_UpdateURLTimeout = null;


function main()
{
	g_Synth = new Synth();
	
	var elemSvgEditor = document.getElementById("svgEditor");
	g_Editor = new Editor(elemSvgEditor, g_Synth);
	
	g_Song = new Song();
	g_Editor.setSong(g_Song);
	g_Editor.refresh();
	
	g_Editor.callbackTogglePlay = refreshButtonPlay;
	g_Editor.callbackCursorChange = callbackCursorChange;
	
	window.onresize = function() { g_Editor.refresh(); };
	window.onbeforeunload = eventBeforeUnload;
	document.getElementById("inputTempo").onkeydown = function(ev) { ev.stopPropagation(); };
    
	refreshButtonPlay(false);
	refreshMainTabs();
	refreshSelectBoxes();
	callbackCursorChange(new Rational(0));
	
	document.getElementById("divToolbox").style.visibility = "visible";
	
	var urlSong = getURLQueryParameter("song");
	if (urlSong != null)
		loadSongData(urlSong, true);
}


function eventBeforeUnload()
{
	return (g_Editor.unsavedChanges ? "Discard unsaved changes?" : null);
}


function askUnsavedChanges()
{
	if (g_Editor.unsavedChanges)
		return window.confirm("Discard unsaved changes?");
	else
		return true;
}


function clearSongData()
{
	g_Song.clear();
	g_Song.sanitize();
	document.getElementById("inputTempo").value = g_Song.bpm.toString();
	g_Editor.setSong(g_Song);
	g_Editor.cursorSetTickBoth(new Rational(0));
	g_Editor.refresh();
	g_Editor.setUnsavedChanges(false);
}


function loadSongData(data, compressed)
{
	try
	{
		g_Song.load(data, compressed);
		document.getElementById("inputTempo").value = g_Song.bpm.toString();
		g_Editor.setSong(g_Song);
		g_Editor.cursorSetTickBoth(new Rational(0));
		g_Editor.refresh();
		g_Editor.setUnsavedChanges(false);
	}
	catch (err)
	{
		window.alert("Error loading song data.");
		clearSongData();
	}
}


function refreshURL(songData)
{
	var urlWithoutQuery = [location.protocol, "//", location.host, location.pathname].join("");
	var newUrl = urlWithoutQuery + (songData == null ? "" : "?song=" + encodeURIComponent(songData));
	window.location = newUrl;
}


function refreshButtonPlay(isPlaying)
{
	var button = document.getElementById("buttonPlay");
	button.innerHTML = isPlaying ? "◼ Stop" : "► Play";
}


function refreshMainTabs()
{
	document.getElementById("tdTabFile")   .style.display = (g_MainTabIndex == 0 ? "block" : "none");
	document.getElementById("tdTabMarkers").style.display = (g_MainTabIndex == 1 ? "block" : "none");
	document.getElementById("tdTabChords") .style.display = (g_MainTabIndex == 2 ? "block" : "none");
	
	document.getElementById("buttonTabFile")   .className = (g_MainTabIndex == 0 ? "toolboxMainTabSelected" : "toolboxButton");
	document.getElementById("buttonTabMarkers").className = (g_MainTabIndex == 1 ? "toolboxMainTabSelected" : "toolboxButton");
	document.getElementById("buttonTabChords") .className = (g_MainTabIndex == 2 ? "toolboxMainTabSelected" : "toolboxButton");
}


function refreshSelectBoxes()
{
	var selectKeyPitch = document.getElementById("selectKeyPitch");
	for (var i = 0; i < 12; i++)
	{
		var option = document.createElement("option");
		option.innerHTML = Theory.getIndependentPitchLabel(i);
		selectKeyPitch.appendChild(option);
	}
	
	var selectKeyScale = document.getElementById("selectKeyScale");
	for (var i = 0; i < Theory.scales.length; i++)
	{
		var option = document.createElement("option");
		option.innerHTML = Theory.scales[i].name;
		selectKeyScale.appendChild(option);
	}
	
	var selectMeterNumerator = document.getElementById("selectMeterNumerator");
	for (var i = 0; i < Theory.meterNumerators.length; i++)
	{
		var option = document.createElement("option");
		option.innerHTML = Theory.meterNumerators[i].toString();
		selectMeterNumerator.appendChild(option);
	}
	selectMeterNumerator.selectedIndex = 3;
	
	var selectMeterDenominator = document.getElementById("selectMeterDenominator");
	for (var i = 0; i < Theory.meterDenominators.length; i++)
	{
		var option = document.createElement("option");
		option.innerHTML = Theory.meterDenominators[i].toString();
		selectMeterDenominator.appendChild(option);
	}
	selectMeterDenominator.selectedIndex = 2;
	
	var selectSnap = document.getElementById("selectSnap");
	for (var i = 0; i < Theory.allowedSnaps.length; i++)
	{
		if (Theory.allowedSnaps[i].startGroup != undefined)
		{
			var group = document.createElement("optgroup");
			group.label = "-- " + Theory.allowedSnaps[i].startGroup + " --";
			selectSnap.appendChild(group);
		}
		
		var option = document.createElement("option");
		option.innerHTML = Theory.allowedSnaps[i].snap.toUserString();
		selectSnap.appendChild(option);
	}
	selectSnap.selectedIndex = 0;
	
	
	var selectChordKinds = document.getElementById("selectChordKinds");
	
	var optionInKey = document.createElement("option");
	optionInKey.innerHTML = "In Key";
	selectChordKinds.appendChild(optionInKey);
	
	for (var i = 0; i < Theory.chordKinds.length; i++)
	{
		if (Theory.chordKinds[i].startGroup != undefined)
		{
			var optGroup = document.createElement("optgroup");
			optGroup.label = "-- " + Theory.chordKinds[i].startGroup + " --";
			selectChordKinds.appendChild(optGroup);
		}		
		
		var option = document.createElement("option");
		
		var labelMain = document.createElement("span");
		var labelSuperscript = document.createElement("sup");
		
		labelMain.innerHTML = Theory.getChordLabelMain(0, i, 0, []);
		labelSuperscript.innerHTML = Theory.getChordLabelSuperscript(0, i, 0, []);
		
		option.appendChild(labelMain);
		labelMain.appendChild(labelSuperscript);
		selectChordKinds.appendChild(option);
	}
	selectChordKinds.selectedIndex = 0;
}


function callbackCursorChange(tick)
{
	var keyAtTick = g_Song.keyChanges.findPrevious(tick);
	if (keyAtTick == null)
		return;
	
	g_CurrentKey = keyAtTick;
	refreshKeyDependentItems();
}


function refreshKeyDependentItems()
{
	handleSelectChordKindsChange();
}


function handleButtonPlay()
{
	g_Editor.togglePlay();
}


function handleButtonRewind()
{
	g_Editor.rewind();
}


function handleInputTempo()
{
	var input = document.getElementById("inputTempo");
	var tempo = parseInt(input.value);
	
	if (Theory.isValidBpm(tempo))
		g_Song.bpm = tempo;
}


function handleSelectSnap()
{
	var snapIndex = document.getElementById("selectSnap").selectedIndex;
	g_Editor.setCursorSnap(Theory.allowedSnaps[snapIndex].snap);
}


function handleButtonInsertKeyChange()
{
	var pitch = document.getElementById("selectKeyPitch").selectedIndex;
	var scaleIndex = document.getElementById("selectKeyScale").selectedIndex;
	g_Editor.insertKeyChange(scaleIndex, pitch);
}


function handleButtonInsertMeterChange()
{
	var numeratorIndex = document.getElementById("selectMeterNumerator").selectedIndex;
	var denominatorIndex = document.getElementById("selectMeterDenominator").selectedIndex;
	g_Editor.insertMeterChange(
		Theory.meterNumerators[numeratorIndex],
		Theory.meterDenominators[denominatorIndex]);
}


function handleSelectChordKindsChange()
{
	var selectedIndex = document.getElementById("selectChordKinds").selectedIndex;
	
	var tonic = g_CurrentKey.tonicMidiPitch;
	var scale = Theory.scales[g_CurrentKey.scaleIndex];
	
	// In Key
	if (selectedIndex == 0)
	{
		for (var i = 0; i < 7; i++)
		{
			var chordKindIndex = Theory.findChordKindForDegree(g_CurrentKey.scaleIndex, i);
			
			var labelMain = document.createElement("span");
			var labelSuperscript = document.createElement("sup");
			labelMain.innerHTML = Theory.getChordLabelMain(g_CurrentKey.scaleIndex, chordKindIndex, scale.pitches[i], [], g_Editor.usePopularNotation);
			labelSuperscript.innerHTML = Theory.getChordLabelSuperscript(g_CurrentKey.scaleIndex, chordKindIndex, scale.pitches[i], [], g_Editor.usePopularNotation);
			
			var button = document.getElementById("buttonChord" + i);
			
			while (button.firstChild != null)
				button.removeChild(button.firstChild);
			
			button.appendChild(labelMain);
			labelMain.appendChild(labelSuperscript);
			
			var degree = Theory.findPitchDegree(g_CurrentKey.scaleIndex, scale.pitches[i], g_Editor.usePopularNotation);
			var degreeColor = Theory.getDegreeColor(degree);
			button.style.borderTop = "4px solid " + degreeColor;
			button.style.borderBottom = "4px solid " + degreeColor;
			
			button.chordKindIndex = chordKindIndex;
			button.rootMidiPitch = scale.pitches[i];
			button.onclick = function()
			{
				g_Editor.insertChord(this.chordKindIndex, this.rootMidiPitch, []);
			};
		}
		
		for (var i = 7; i < 12; i++)
		{
			var button = document.getElementById("buttonChord" + i);
			button.style.visibility = "hidden";
		}
	}
	
	else
	{
		var chordKindIndex = selectedIndex - 1;
		var buttonAssignment = [0, 2, 4, 5, 7, 9, 11, 1, 3, 6, 8, 10];
		
		for (var i = 0; i < 12; i++)
		{
			var pitch = buttonAssignment[i];
			
			var labelMain = document.createElement("span");
			var labelSuperscript = document.createElement("sup");
			labelMain.innerHTML = Theory.getChordLabelMain(g_CurrentKey.scaleIndex, chordKindIndex, pitch, [], g_Editor.usePopularNotation);
			labelSuperscript.innerHTML = Theory.getChordLabelSuperscript(g_CurrentKey.scaleIndex, chordKindIndex, pitch, [], g_Editor.usePopularNotation);
			
			var button = document.getElementById("buttonChord" + i);
			
			while (button.firstChild != null)
				button.removeChild(button.firstChild);
			
			button.appendChild(labelMain);
			labelMain.appendChild(labelSuperscript);
			
			var degree = Theory.findPitchDegree(g_CurrentKey.scaleIndex, pitch, g_Editor.usePopularNotation);
			var degreeColor = Theory.getDegreeColor(degree);
			button.style.borderTop = "4px solid " + degreeColor;
			button.style.borderBottom = "4px solid " + degreeColor;
		
			button.style.visibility = "visible";
			
			button.chordKindIndex = chordKindIndex;
			button.rootMidiPitch = (pitch + g_CurrentKey.tonicMidiPitch) % 12;
			button.onclick = function()
			{
				g_Editor.insertChord(this.chordKindIndex, this.rootMidiPitch, []);
			};
		}
	}
}


function handleCheckboxPopularNotation()
{
	g_Editor.usePopularNotation = document.getElementById("checkboxPopularNotation").checked;
	g_Editor.refresh();
	refreshKeyDependentItems();
}


function handleCheckboxChordPatterns()
{
	g_Editor.useChordPatterns = document.getElementById("checkboxChordPatterns").checked;
}


function handleButtonNew()
{
	if (!askUnsavedChanges())
		return;
	
	clearSongData();
	g_Editor.setUnsavedChanges(false);
	refreshURL(null);
}


function handleButtonGenerateLink()
{
	var songData = g_Song.save(true);
	g_Editor.setUnsavedChanges(false);
	refreshURL(songData);
}


function handleButtonLoadString(compressed)
{
	if (!askUnsavedChanges())
		return;
	
	var data = window.prompt("Paste a saved song data:", "");
	if (data == null)
		return;
	
	loadSongData(data, compressed);
}


function handleButtonSaveString(compressed)
{
	var songData = g_Song.save(compressed);
	var data = "data:text/plain," + encodeURIComponent(songData);
	window.open(data);
	g_Editor.setUnsavedChanges(false);
}


function handleButtonLoadDropbox()
{
	if (!askUnsavedChanges())
		return;
	
	Dropbox.choose(
	{
		linkType: "direct",
		multiselect: false,
		success: function(files)
		{
			var xhr = new XMLHttpRequest();
			xhr.open("get", files[0].link, true);
			xhr.responseType = "text";
			xhr.onload = function()
			{
				if (xhr.status == 200)
					loadSongData(xhr.response);
				else
					window.alert("Error loading Dropbox file.");
			};
			xhr.send();
		}
	});
}


// Still not working...
function handleButtonSaveDropbox()
{
	var songData = g_Song.save();
	var data = "data:text/plain," + encodeURIComponent(songData);
	
	Dropbox.save(
		data,
		"song.txt",
		{
			success: function() { window.alert("Successfully saved file to Dropbox."); g_Editor.setUnsavedChanges(false); },
			error: function(msg) { window.alert("Error saving file to Dropbox.\n\nError message: " + msg); }
		});
}


// Still not working...
function handleButtonSaveAsDropbox()
{
	var filename = window.prompt("Save under what filename?", "song.txt");
	if (filename == null)
		return;
	
	var songData = g_Song.save();
	var data = "data:text/plain," + encodeURIComponent(songData);
	
	Dropbox.save(
		data,
		filename,
		{
			success: function() { window.alert("Successfully saved file to Dropbox."); g_Editor.setUnsavedChanges(false); },
			error: function(msg) { window.alert("Error saving file to Dropbox.\n\nError message: " + msg); }
		});
}


function getURLQueryParameter(name)
{
	var url = window.location.search;
	
	name = name.replace(/[\[\]]/g, "\\$&");
	
	var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
	var results = regex.exec(url);
	
	if (!results)
		return null;
	
	if (!results[2])
		return "";
	
	return decodeURIComponent(results[2].replace(/\+/g, " "));
}