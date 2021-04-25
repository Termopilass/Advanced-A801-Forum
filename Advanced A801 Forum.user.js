// ==UserScript==
// @name         Advanced A801 Forum
// @namespace    Termopilass#0000
// @version      1.0.0
// @description  Bringing another experience
// @author       Termopilass#0000
// @match        https://atelier801.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
        'use strict';

        if (document.location.pathname === "/topic")
        {
                var interval = 120000;
                var timeoutID = null;
                var loadMessages = false;
                var postponedMessageID = null;
                var AAFCheckbox;
                var AAFPostponeCheckbox;
                var promise;
                var promiseController;
                var currentURL = window.location.href.replace("https://atelier801.com", "");
                var currentURLNoPage = currentURL.replace(/((&(p|d|n)=)\d*)+|#.*/g, "").replace(/\?t=(\d*)&f=(\d*)/, "?f=$2&t=$1");
                var grantedNotification = false;

                var page = currentPage();
                var firstMessage = 1+20*(page-1);
                var lastMessage = 20*page;
                setActiveMessageContent();
                if (document.getElementsByClassName("cadre cadre-relief cadre-repondre ltr")[0] !== undefined) setPostponeMessageContent();
                if (GM_getValue("Reload") !== undefined)
                {
                        var Reload = GM_getValue("Reload");
                        var ReloadFind = Reload.find(function (element) {
                                return element.page === currentURLNoPage;
                        });
                        if (ReloadFind === undefined) AAFCheckbox.checked = false;
                        else
                        {
                                interval = ReloadFind.interval;
                                document.getElementById("AAFInput").value = interval;
                                AAFCheckbox.checked = ReloadFind.checkbox;
                        }
                }
                if (AAFCheckbox.checked) enableMessageContent();
                else disableMessageContent();
                Notification.requestPermission(function (permission) {
                        grantedNotification = permission === "granted";
                });
        }

        // addMessage(content, id_message)
        // This function adds messages, but also changes the content of messages if there is an edited message.
        function addMessage(content, id_message)
        {
                var currentMessage = document.getElementById("m" + id_message);
                if (currentMessage === null) // Then add the message.
                {
                        var previousMessage = lastPreviousMessage(id_message);
                        if (previousMessage === null) document.getElementById("corps").getElementsByTagName("div")[0].outerHTML += content.outerHTML;
                        else previousMessage.outerHTML += content.outerHTML;
                        loadMessages = true;
                        postponeMessage();
                        if (grantedNotification)
                        {
                                var span = content.getElementsByClassName("dropdown-toggle highlightit")[0];
                                var user = span.getElementsByTagName("span")[0].textContent;
                                var message = content.getElementsByClassName("cadre-message-message")[0];
                                var messageButtons = message.getElementsByTagName("button");
                                for (var i = 0; i < messageButtons.length;) messageButtons[i].remove();
                                var messageSmalls = message.getElementsByTagName("small");
                                for (i = 0; i < messageSmalls.length;) messageSmalls[i].remove();
                                message.innerHTML = message.innerHTML.replaceAll(/<br>|<hr>/, "\r\n");
                                message = message.textContent;
                                if (message.length > 100) message = message.substring(0, 100)+"...";
                                var icon = span.getElementsByTagName("img")[1] !== undefined ? span.getElementsByTagName("img")[1].src : null;
                                var options = icon !== null ? {body : message, icon: icon} : {body : message};
                                var notification = new Notification(user, options);
                        }
                }
                else // Otherwise, check for changes of the existing message and try to edit it.
                {
                        var currentStatus = currentMessage.parentElement.getElementsByClassName("cadre-message-supprime")[0] === undefined ? currentMessage.parentElement.getElementsByClassName("cadre-message-modere")[0] === undefined ? "active" : "moderated" : "deleted";
                        var newStatus = content.getElementsByClassName("cadre-message-supprime")[0] === undefined ? content.getElementsByClassName("cadre-message-modere")[0] === undefined ? "active" : "moderated" : "deleted";
                        if (currentStatus !== newStatus) currentMessage.parentElement.parentElement.outerHTML = content.outerHTML;
                        else
                        {
                                var currentContent = currentMessage.getElementsByClassName("cadre-message-message")[0].textContent;
                                var newContent = content.getElementsByClassName("cadre-message-message")[0].textContent;

                                var currentEdit = currentMessage.getElementsByClassName("cadre-message-dates")[0];
                                var newEdit = content.getElementsByClassName("cadre-message-dates")[0];
                                if (currentContent !== newContent // Check if the old content and the new content of the message are different
                                || newEdit !== undefined && (currentEdit === undefined || currentEdit.getElementsByTagName("span")[0].innerHTML !== timestampToDateString(newEdit.getElementsByTagName("span")[0].innerHTML))) // Check the difference between currentEdit and newEdit (message editing date spans)
                                { currentMessage.parentElement.parentElement.outerHTML = content.outerHTML; loadMessages = true; }
                        }
                }
        }

        function addPopup(template)
        {
                var popup = template.content.getElementById("popup_resultat_requete");
                if (popup === null) return false;
                if (document.getElementById("popup_resultat_requete") !== null) document.getElementById("popup_resultat_requete").outerHTML = popup.outerHTML;
                else document.getElementById("contenant-corps-et-footer").appendChild(popup);
                chargerPage();
                AAFCheckbox.checked = false;
                disableMessageContent();
                return true;
        }

        function removeMessage(id_message)
        {
                var currentMessage = document.getElementById("m" + id_message);
                if (currentMessage !== null) currentMessage.parentElement.parentElement.remove();
        }

        function timestampToDateString(timestamp)
        {
                var date = new Date(parseInt(timestamp));
                var day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
                var month = date.getMonth() < 9 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1;
                var year = date.getFullYear();
                var hours = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
                var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
                return day + "/" + month + "/" + year + " " + hours + ":" + minutes;
        }

        function currentPage()
        {
                var selectPage = document.getElementsByClassName("cadre-pagination btn-group ltr")[0];
                if (selectPage === undefined) return 1;
                var goToFirstPage = selectPage.getElementsByClassName("btn btn-inverse")[0].innerHTML === "«";
                return goToFirstPage ? parseInt(selectPage.getElementsByClassName("btn btn-inverse")[2].innerHTML.match(/(\d+)/)[0]) : 1;
        }

        function updateNumberOfPages(content)
        {
                if (content === undefined) return;
                for (var i = 0; i < 2; i++)
                {
                        var pageFunction = document.getElementsByClassName("form-pagination")[i]; // Yes, there are two form-pagination, you'll notice it if you use the mobile version or make the window small, it is at the footer.
                        if (pageFunction === undefined) { if (document.getElementsByClassName("barre-navigation  ltr")[i] !== undefined) document.getElementsByClassName("barre-navigation  ltr")[i].outerHTML += content.outerHTML; }
                        else
                        {
                                var elements = pageFunction.getElementsByTagName("a");
                                var elementsTemplate = content.getElementsByTagName("a");
                                for (var j = 0; j < elements.length; j++) elements[j].outerHTML = elementsTemplate[j].outerHTML;
                                // elements.length will change, so let's put this value in a variable along with elementsTemplate.length.
                                var elementsl = elements.length;
                                var elementsTl = elementsTemplate.length;
                                for (j = elementsTl; j > elementsl; j--) pageFunction.getElementsByTagName("input")[3].outerHTML += elementsTemplate[j - 1].outerHTML;
                                pageFunction.getElementsByClassName("input-pagination")[0].setAttribute("max", content.getElementsByClassName("input-pagination")[0].getAttribute("max"));
                        }
                }
        }

        function reloadWebsite()
        {
                promiseController = new AbortController();
                var signal = promiseController.signal;
                promise = fetch(currentURL, signal).then(function(response) {
                        response.text().then(function(text) {
                                if (response.ok)
                                {
                                        if (AAFCheckbox.checked === false) return; // Just in case anything else fails
                                        setActiveMessageContent();
                                        var template = document.createElement("template");
                                        template.innerHTML = text.trim(); // Faster than DOMParser() for some reason
                                        if (addPopup(template)) return;
                                        for (var i = firstMessage; i <= lastMessage; i++)
                                        {
                                                var currentMessage = template.content.getElementById("m" + i);
                                                if (currentMessage !== null) addMessage(currentMessage.parentElement.parentElement, i);
                                                else removeMessage(i);
                                        }
                                        if (loadMessages)
                                        {
                                                // These functions appear on the Atelier801 forum
                                                parserDates();
                                                majCadresMessage();
                                                verifieOrdreUl();
                                                loadMessages = false;
                                        }
                                        updateNumberOfPages(template.content.querySelector(".groupe-boutons-barre-droite "));
                                        timeoutID = setTimeout(reloadWebsite, interval);
                                }
                                else
                                {
                                        if (response.status >= 500) setHiddenMessageContent("!!! Server error");
                                        else setHiddenMessageContent("!!! Error at reloading the messages");
                                        timeoutID = setTimeout(reloadWebsite, 1000);
                                }
                        });
                }).catch(function(e) {
                        setHiddenMessageContent("!!! No Internet Connection");
                        timeoutID = setTimeout(reloadWebsite, 1000);
                });
        }

        function lastPreviousMessage(id_message)
        {
                for (var i = id_message - 1; i >= firstMessage; i--)
                {
                        var currentMessage = document.getElementById("m" + i);
                        if (currentMessage !== null) return currentMessage.parentElement.parentElement;
                }
                return null;
        }

        function setA801Interval()
        {
                var newInterval = document.getElementById("AAFInput").value;
                if (newInterval < 100 || newInterval > 86400000) { alert("The value must be between 100 and 86400000 milliseconds."); return; }
                if (promiseController !== undefined) promiseController.abort();
                interval = parseInt(newInterval);
                var Reload = GM_getValue("Reload") !== undefined ? GM_getValue("Reload") : [];
                var ReloadFind = Reload.findIndex(function (element) {
                        return element.page === currentURLNoPage;
                });
                if (ReloadFind === -1) Reload.push({"page" : currentURLNoPage, "interval" : interval, "checkbox" : AAFCheckbox.checked});
                else Reload[ReloadFind] = {"page" : currentURLNoPage, "interval" : interval, "checkbox" : AAFCheckbox.checked};
                GM_setValue("Reload", Reload);
                clearTimeout(timeoutID);
                if (AAFCheckbox.checked) timeoutID = setTimeout(reloadWebsite, interval);
        }

        function setActiveMessageContent()
        {
                document.getElementsByClassName("container-fluid menu-principal ltr")[0].setAttribute("style", "");
                if (document.getElementById("AAFInput") === null)
                {
                        AAFCheckbox = document.createElement("input");
                        AAFCheckbox.setAttribute("id", "AAFCheckbox");
                        AAFCheckbox.setAttribute("type", "checkbox");
                        AAFCheckbox.setAttribute("style", "margin-top: 13px;");
                        AAFCheckbox.addEventListener("change", function () {
                                if (this.checked) enableMessageContent();
                                else disableMessageContent();
                        });
                        var aInput = document.createElement("a");
                        aInput.setAttribute("id", "AAFA");
                        aInput.setAttribute("class", "element-menu-principal");
                        aInput.innerHTML = "Milliseconds:";
                        var numberInput = document.createElement("input");
                        numberInput.setAttribute("id", "AAFInput");
                        numberInput.setAttribute("class", "input-pagination");
                        numberInput.setAttribute("type", "number");
                        numberInput.setAttribute("min", "100");
                        numberInput.setAttribute("max", "86400000");
                        numberInput.setAttribute("value", interval);
                        numberInput.setAttribute("style", "margin-top: 5px; margin-right: 5px; width: 100px;");
                        numberInput.addEventListener("keydown", function(e) {
                                if (e.keyCode === 13) setA801Interval();
                        });
                        var submitInput = document.createElement("input");
                        submitInput.setAttribute("id", "AAFSubmit");
                        submitInput.setAttribute("class", "btn");
                        submitInput.setAttribute("type", "submit");
                        submitInput.setAttribute("value", "Save");
                        submitInput.addEventListener("click", setA801Interval, false);
                        var liNavbar1 = document.createElement("li");
                        liNavbar1.appendChild(AAFCheckbox);
                        var liNavbar2 = document.createElement("li");
                        liNavbar2.appendChild(aInput);
                        var liNavbar3 = document.createElement("li");
                        liNavbar3.appendChild(numberInput);
                        var liNavbar4 = document.createElement("li");
                        liNavbar4.appendChild(submitInput);
                        var navigationBar = document.getElementsByClassName("nav  ltr")[0];
                        navigationBar.appendChild(liNavbar1);
                        navigationBar.appendChild(liNavbar2);
                        navigationBar.appendChild(liNavbar3);
                        navigationBar.appendChild(liNavbar4);
                        if (document.getElementsByClassName("cadre cadre-relief cadre-repondre ltr")[0] !== undefined)
                        {
                                document.getElementsByClassName("cadre cadre-relief cadre-repondre ltr")[0].getElementsByClassName("btn btn-post")[0].addEventListener("click", function () {
                                        document.getElementById("AAFCheckbox").checked = false;
                                        disableMessageContent();
                                });
                        }
                }
                else
                {
                        document.getElementById("AAFCheckbox").style.visibility = "visible";
                        document.getElementById("AAFA").innerHTML = "Milliseconds:";
                        document.getElementById("AAFInput").style.visibility = "visible";
                        document.getElementById("AAFSubmit").style.visibility = "visible";
                }
        }

        function setHiddenMessageContent(text)
        {
                document.getElementsByClassName("container-fluid menu-principal ltr")[0].setAttribute("style", "background-color:#411c22;");
                document.getElementById("AAFCheckbox").style.visibility = "hidden";
                document.getElementById("AAFA").innerHTML = text;
                document.getElementById("AAFInput").style.visibility = "hidden";
                document.getElementById("AAFSubmit").style.visibility = "hidden";
        }

        function enableMessageContent()
        {
                timeoutID = setTimeout(reloadWebsite, interval);
                document.getElementById("AAFInput").disabled = false;
        }

        function disableMessageContent()
        {
                if (promiseController !== undefined) promiseController.abort();
                clearTimeout(timeoutID);
                document.getElementById("AAFInput").disabled = true;
        }

        function setPostponeMessageContent()
        {
                var div = document.getElementsByClassName("cadre cadre-relief cadre-repondre ltr")[0].getElementsByClassName("control-group")[1].getElementsByClassName("controls ")[0];
                AAFPostponeCheckbox = document.createElement("input");
                AAFPostponeCheckbox.setAttribute("id", "AAFPostponeCheckbox");
                AAFPostponeCheckbox.setAttribute("type", "checkbox");
                AAFPostponeCheckbox.setAttribute("style", "margin-bottom: 5px; margin-right: 5px;");
                AAFPostponeCheckbox.checked = false;
                AAFPostponeCheckbox.disabled = true;
                AAFPostponeCheckbox.addEventListener("change", function () {
                        if (!this.checked) { postponedMessageID = null; this.disabled = true; }
                });
                div.appendChild(AAFPostponeCheckbox);
                var label = document.createElement("a");
                label.setAttribute("style", "color: #c2c2da; margin-right: 5px;");
                label.innerHTML = "Message ID:";
                div.appendChild(label);
                var input = document.createElement("input");
                input.setAttribute("id", "AAFPostponeInput");
                input.setAttribute("class", "input-pagination");
                input.setAttribute("type", "number");
                input.setAttribute("min", firstMessage);
                input.setAttribute("max", lastMessage);
                input.setAttribute("value", lastMessage);
                input.setAttribute("style", "margin-right: 5px; width: 80px;");
                input.onkeypress = function(e) { if (e.keyCode === 13) { setPostponeMessage(); return false; } }
                div.appendChild(input);
                var button = document.createElement("input");
                button.setAttribute("class", "btn");
                button.setAttribute("type", "submit");
                button.setAttribute("value", "Postpone");
                button.setAttribute("onclick", "return false;");
                button.addEventListener("click", setPostponeMessage, false);
                div.appendChild(button);
        }

        function setPostponeMessage()
        {
                var messageID = document.getElementById("AAFPostponeInput").value;
                if (messageID >= firstMessage && messageID <= lastMessage)
                {
                        postponedMessageID = messageID;
                        AAFPostponeCheckbox.checked = true;
                        AAFPostponeCheckbox.disabled = false;
                        postponeMessage();
                }
                else alert("Set a Message ID in the range " + firstMessage + "-" + lastMessage + ".");
        }

        function postponeMessage()
        {
                if (postponedMessageID === null) return;
                var message = document.getElementById("m" + postponedMessageID);
                if (message !== null)
                {
                        AAFCheckbox.checked = false;
                        disableMessageContent();
                        document.getElementsByClassName("cadre cadre-relief cadre-repondre ltr")[0].getElementsByClassName("btn btn-post")[0].click();
                }
        }
})();