window.clickableEditor = {};

jQuery(document).ready(function($) {
	/********************************************
	 * Update editor to use align= as alignment *
	 ********************************************/
	$.sceditorBBCodePlugin.bbcode
		.set("align", {
			html: function(element, attrs, content) {
				return '<div align="' + (attrs.defaultattr || 'left') + '">' + content + '</div>';
			},
			isInline: false
		})
		.set("center", { format: "[align=center]{0}[/align]" })
		.set("left", { format: "[align=left]{0}[/align]" })
		.set("right", { format: "[align=right]{0}[/align]" })
		.set("justify", { format: "[align=justify]{0}[/align]" });

	$.sceditor.command
		.set("center", { txtExec: ["[align=center]", "[/align]"] })
		.set("left", { txtExec: ["[align=left]", "[/align]"] })
		.set("right", { txtExec: ["[align=right]", "[/align]"] })
		.set("justify", { txtExec: ["[align=justify]", "[/align]"] });


	/************************************************
	 * Update font to support MyBB's BBCode dialect *
	 ************************************************/
	$.sceditorBBCodePlugin.bbcode
		.set("list", {
			html: function(element, attrs, content) {
				var type = (attrs.defaultattr === '1' ? 'ol' : 'ul');

				return '<' + type + '>' + content + '</' + type + '>';
			},
			breakAfter: false
		})
		.set("ul", { format: "[list]{0}[/list]" })
		.set("ol", { format: "[list=1]{0}[/list]" })
		.set("li", { format: "[*]{0}", excludeClosing: true })
		.set("*", { excludeClosing: true, isInline: false });

	$.sceditor.command
		.set("bulletlist", { txtExec: ["[list]\n[*]", "\n[/list]"] })
		.set("orderedlist", { txtExec: ["[list=1]\n[*]", "\n[/list]"] });


	/********************************************
	 * Update quote to support pid and dateline *
	 ********************************************/
	$.sceditorBBCodePlugin.bbcode.set("quote", {
		format: function(element, content) {
			var	author = '',
				$elm  = $(element),
				$cite = $elm.children("cite").first();

			if($cite.length === 1 || $elm.data("author")) {
				author = $cite.text() || $elm.data("author");

				$elm.data("author", author);
				$cite.remove();

				$elm.children("cite").replaceWith(function() {
					return $(this).text();
				});

				content	= this.elementToBbcode($(element));
				author  = '=' + author;
			}

			if($elm.data('pid'))
				author += " pid='" + $elm.data('pid') + "'";

			if($elm.data('dateline'))
				author += " dateline='" + $elm.data('dateline') + "'";

			return '[quote' + author + ']' + content + '[/quote]';
		},
		html: function(token, attrs, content) {
			var data = '';

			if(attrs.pid)
				data += ' data-pid="' + attrs.pid + '"';

			if(attrs.dateline)
				data += ' data-dateline="' + attrs.dateline + '"';

			if(typeof attrs.defaultattr !== "undefined")
				content = '<cite>' + attrs.defaultattr + '</cite>' + content;

			return '<blockquote' + data + '>' + content + '</blockquote>';
		}
	});



	/*************************************
	 * Remove last bits of table support *
	 *************************************/
	$.sceditor.command.remove('table');
	$.sceditorBBCodePlugin.bbcode.remove('table')
					.remove('tr')
					.remove('th')
					.remove('td');


	/*******************
	 * Init the editor *
	 *******************/
	$("#message, #signature").sceditor({
		style:			"jscripts/sceditor/jquery.sceditor.mybb.css",
		toolbar:		"bold,italic,underline,strike,subscript,superscript|left,center,right,justify|" +
					"font,size,color,removeformat|bulletlist,orderedlist|" +
					"code,quote|horizontalrule,image,email,link,unlink|emoticon,youtube,date,time|" +
					"print,source",
		resizeMaxHeight:	800,
		plugins:		'bbcode',
		autofocus:		sceditor_autofocus,
		locale:			sceditor_lang,
		emoticons:		mybb_emoticons
	});



	/******************************
	 * Source mode option support *
	 ******************************/
	if(sceditor_sourcemode)
		$("#message, #signature").sceditor("instance").sourceMode(true);



	/**************************
	 * Emoticon click support *
	 **************************/
	$("#clickable_smilies img").each(function() {
		$(this).css('cursor', 'pointer');

		$(this).click(function() {
			$("#message, #signature").data("sceditor").insert($(this).attr('alt'));
			return false;
		});
	});



	/************************************
	 * clickableEditor compat functions *
	 ************************************/
	clickableEditor.insertAttachment = function(aid) {
		$("#message, #signature").data("sceditor").insertText('[attachment='+aid+']');
	};

	clickableEditor.performInsert = function(code) {
		$("#message, #signature").data("sceditor").insert(code);
	};

	clickableEditor.openGetMoreSmilies = function(editor)
	{
		MyBB.popupWindow('misc.php?action=smilies&popup=true&editor='+editor, 'sminsert', 240, 280);
	};



	/****************************
	 * Form reset compatibility *
	 ****************************/
	var textarea = $("#message, #signature").get(0);
	if(textarea)
	{
		$(textarea.form).bind("reset", function() {
			$("#message, #signature").data("sceditor").val("");
		});
	}
});

/**********************************
 * Thread compatibility functions *
 **********************************/
if(typeof Thread !== "undefined")
{
	var quickReplyFunc = Thread.quickReply;
	// update the textarea to the editors value before the Thread class
	// uses it for quickReply, ect.
	Thread.quickReply = function(e) {
		var editor = jQuery("#message, #signature").data("sceditor");

		if(editor)
			editor.updateOriginal();

		return quickReplyFunc.call(Thread, e);
	};

	Thread.multiQuotedLoaded = function(request)
	{
		if(request.responseText.match(/<error>(.*)<\/error>/))
		{
			message = request.responseText.match(/<error>(.*)<\/error>/);
			if(!message[1])
				message[1] = "An unknown error occurred.";

			if(this.spinner)
			{
				this.spinner.destroy();
				this.spinner = '';
			}

			alert('There was an error fetching the posts.\n\n'+message[1]);
		}
		else if(request.responseText)
		{
			var editor = jQuery("#message, #signature").data("sceditor");

			if(editor)
				editor.insert(request.responseText);
		}

		Thread.clearMultiQuoted();
		$('quickreply_multiquote').hide();
		$('quoted_ids').value = 'all';

		if(this.spinner)
		{
			this.spinner.destroy();
			this.spinner = '';
		}
	};
}
