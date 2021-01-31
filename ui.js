$(async function() {
    // cache same selectors we'll be using quite a bit
    const $body = $("body");
    const $allStoriesList = $("#all-articles-list");
    const $submitForm = $("#submit-form");
    const $favoritedStories = $("#favorited-articles");
    const $filteredArticles = $("#filtered-articles");
    const $loginForm = $("#login-form");
    const $createAccountForm = $("#create-account-form");
    const $ownStories = $("#my-articles");
    const $navLogin = $("#nav-login");
    const $navWelcome = $("#nav-welcome");
    const $navUserProfile = $("#nav-user-profile");
    const $navLogOut = $("#nav-logout");
    const $navSubmit = $("#nav-submit");
    const $userProfile = $("#user-profile");

// global storyList variable
let storyList = null;

// global User variable
let currentUser = null;

await checkIfLoggedIn();

/**
 * Event Listener for logging in.
 * If successfully we will setup the user instance
 */

 $loginForm.on("submit", async function(evt) {
     evt.preventDefault(); // no page-refresh on submit

     // grab the username and password
     const username = $("#login-username").val();
     const password = $("#login-password").val();

     // call the login static method to build a user instance
     const userInstance = await User.login(username, password);
     // set the global user to the user instance
     currentUser = userInstance;
     syncCurrentUserToLocalStorage();
     loginAndSubmitForm();
 });

 /**
  * Event listener for signing up.
  * If successfully we will setup a new user instance
  */

  $createAccountForm.on("submit", async function(evt) {
      evt.preventDefault(); // no page refresh

      // grab the required fields
      const name = $("#create-account-name").val();
      const username = $("#create-account-username").val();
      const password = $("#create-account-password").val();

      // call the create method, which calls the API and then builds a new user instance
      const newUser = await User.create(username, password, name)
      
      currentUser = newUser;
      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();
  });

  /**
   * Log out Functionality
   */

   $navLogOut.on("click", function() {
       // empty out local storage
       localStorage.clear();
       // refresh the page, clearing memory
       location.reload();
   });

   /**
    * Submit article event handler.
    * 
    */

    $submitForm.on("submit", async function(evt) {
        evt.preventDefault(); // no page refresh

        // grab all the info from the form
        const title = $("#title").val();
        const url = $("#url").val();
        const hostName = getHostName(url);
        const author = $("#author").val();
        const username = currentUser.username

        const storyObject = await storyList.addStory(currentUser, {
            title,
            author,
            url,
            username
        });

    // generate markup for the new story
    const $li = $(`
    <li id="${storyObject.storyId}" class="id-${storyObject.storyId}">
        <span class="star">
        <i class="far fa-star"></i>
        </span>
        <a class="article-link" href="${url}" target="a_blank">
        <strong>${title}</strong>
        </a>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-author">by ${author}</small>
        <small class="article-username">posted by ${username}</small>
        </li>
    `);
    $allStoriesList.prepend($li);

    // hide the form and reset it
    $submitForm.slideUp("slow");
    $submitForm.trigger("reset");
    });

    /**
     * Starting favorites event handler
     * 
     */

     $(".articles-container").on("click", ".star", async function(evt) {
         if (currentUser) {
             const $tgt = $(evt.target);
             const $closestLi = $tgt.closest("li");
             const storyId = $closestLi.attr("id");

             // if the item is already favorited
             if ($tgt.hasClass("fas")) {
                 // remove the favorite from the user's list
                 await currentUser.removeFavorite(storyId);
                 // then change the class to be an empty star
                 $tgt.closest("i").toggleClass("fas far");
                } else {
                 // the item is un-favorited
                 await currentUser.addFavorite(storyId);
                 $tgt.closest("i").toggleClass("fas far"); 
                }
             }
         });
   /**
    * Event Handler for Clicking Login
    */

    $navLogin.on("click", function() {
        // show the login and Create Account Forms
        $loginForm.slideToggle();
        $createAccountForm.slidetoggle();
        $allStoriesList.toggle();
    });

    /** 
     * Event handler for on your profile
     */

     $navUserProfile.on("click", function() {
         // hide everything
         hideElements();
         //except the user profile
         $userProfile.show();
     });

     /**
      * Event Handler for navigation submit
      */

      $navSubmit.on("click", function() {
          if (currentUser) {
              hideElements();
              $allStoriesList.show();
              $submitForm.slideToggle();
          }
      });

      /**
       * Event handler for navigation to favorites
       */
      $body.on("click", "nav-favorites", function() {
          hideElements();
          if (currentUser) {
              generateFaves();
              $favoritedStories.show();
          }
      });

    /**
     * Event handler for navigation to Homepage
     */

    $("body").on("click", "#nav-all", async function() {
         hideElements();
         await generateStories();
         $allStoriesList.show();
     });

    /**
      * Event Handler for navigation to my Stories
      */
     $body.on("click", "#nav-my-stories", function() {
         hideElements();
         if (currentUser) {
             $userProfile.hide();
             generateMystories();
             $ownStories.show();
         }
     });

    /**
     * Event Handler for deleting a single story
     */
     $ownStories.on("click", ".trash-can", async function(evt) {
         // get the story's ID
         const $closestLi = $(evt.target).closest("li");
         const storyId = $closestLi.attr("id");

         // remove the story from the API
         await storyList.removeStory(currentUser, storyId);

         // re-generate the story list
         await generateStories();

         // hide everything
         hideElements();

         // ...except the story list
         $allStoriesList.show();
     });

     /**
      * On page load, checks local storage to see if the user is already logged in.
      * Renders page information accordingly.
      */

    async function checkIfLoggedIn() {
        // Let's see if we're logged in
        const token = localStorage.getItem("token");
        const username = localStorage.getItem("username");

        // if there is a token in localStorage, call User.getLoggedInUser
        // to get an instance of user with the right details
        // this is designed to run once, on page load
        currentUser = await User.getLoggedInUser(token, username);
        await generateStories();

        if (currentUser) {
            generateProfile();
            showNavForLoggedInUser();
        }
    }

    /**
     * A rendering function to run to reset the forms and hide the login info
     */

    function loginAndSubmitForm() {
         // hide the forms for logging in and signing up
         $loginForm.hide();
         $createAccountForm.hide();

         // reset those forms
         $loginForm.trigger("reset");
         $createAccountForm.trigger("reset");

         // show the stories
         $allStoriesList.show();

         // update the navigation bar
         showNavForLoggedInUser();

         // get a user profile
         generateProfile();
    }

    /**
     * Build a user profile based on the global "user" instance
     */

     function generateProfile() {
         // show your name
         $("#profile-name").text(`name: ${currentUser.name}`);
         // show your username
         $("#profile-username").text(`Username: ${currentUser.username}`);
         // format and display the account creation date
         $("#profile-account-date").text(
             `Account Created: ${currentUser.createdAt.slice(0, 10)}`
         );
         // set the navigation to list the username
         $navUserProfile.text(`${currentUser.username}`);
     }

    /**
    * A redering function to call the storyList.getStories static method,
    * which will generate a storyListInstance. Then render it.
    */

    async function generateStories() {
          // get an instance of StoryList
          const storyListInstance = await StoryList.getStories();
          // update our global variable
          storyList = storyListInstance;
          // empty out that part of the page
          $allStoriesList.empty();

          // loop through all of our stories and generate HTML for them
          for (let story of storyList.stories) {
              const result = generateStoryHTML(story);
              $allStoriesList.append(result);
          }
    }

    /**
     * A render method to render HTML for an individual story instance
     * - story: an instance of story
     * - isOwnStory: was the story posted by the current user
     */

    function generateStoryHTML(story, isOwnStory) {
         let hostName = getHostName(story.url);
         let starType = isFavorite(story) ? "fas" : "far";

    // render a trash can deleting for your own story
    const trashCanIcon = isOwnStory
    ? `<span class="trash-can">
        <i class="fas fa-trash-alt"></li>
        </span>`
    : "";

    // render all the rest of the story markup
    const storyMarkup = $(`
     <li id="${story.storyId}">
       ${trashCanIcon}
        <span class="star">
        <i class="${starType} fa-star"></li>
    </span>
    <a class="article-link" href="${story.url}" target="a_blank">
        <strong>${story.title}</strong>
        </a>
    <small class="article-author">by ${story.author}</small>
    <small class="article-hostname ${hostName}">(${hostName})</small>
    <small class="article-username">posted by ${story.username}</small>
    </li>
    `);

    return storyMarkup;
     }

     /**
      * A rendering function to build the favorite list
      */

    function generateFaves() {
         // empty out the list by default
         $favoritedStories.empty();

         // if the user has no favorites
         if (currentUser.favorites.length === 0) {
             $favoritedStories.append("<h5>No favorited added!</h5>");
         } else {
             // for all of the user's favorites
             for (let story of currentUser.favorites) {
                 // render each story in the list
                 let favoriteHTML = generateStoryHTML(story, false, true);
                 $favoritedStories.append(favoriteHTML);
             }
         }
     }

     function generateMystories() {
           $ownStories.empty();

           // if the user has no stories that they have posted
           if (currentUser.ownStories.length === 0) {
               $ownStories.append("<h5>No stories added by the user yet!</h5>");
           } else {
               // for all of the user's posted stories
               for (let story of currentUser.ownStories) {
                   // render each story in the list
                   let ownStoryHTML = generateStoryHTML(story, true);
                   $ownStories.append(ownStoryHTML);
               }
           }
           $ownStories.show();
         }   

    function hideElements() {
           const elementsArr = [
               $allStoriesList,
               $createAccountForm,
               $filteredArticles,
               $submitForm,
               $loginForm,
               $ownStories,
               $userProfile,
               $favoritedStories
           ];
           elementsArr.forEach($elem => $elem.hide());
    }

    function showNavForLoggedInUser() {
           $navLogin.hide();
           $userProfile.hide();
           $(".main-nav-links, #user-profile").toggleClass("hidden");
           $navWelcome.show();
           $navLogOut.show();
    }

    /* see if specific story is in user's list of favorites */

    function isFavorite(story) {
        let favStoryIds = new Set();
        if (currentUser) {
            favStoryIds = new Set(currentUser.favorites.map(obj => obj.storyId));
        }
        return favStoryIds.has(story.storyId);
    }

    /* simple function to pull the hostname from a URL */

    function getHostName(url) {
        let hostName;
        if (url.indexOf("://") > -1) {
            hostName = url.split("/")[2];
       } else {
           hostName = url.split("/")[0];
       }
       if (hostName.slice(0, 4) === "www.") {
           hostName = hostName.slice(4);
       }
        return hostName;
    }

    /* sync current user information to localStorage */

    function syncCurrentUserToLocalStorage() {
        if (currentUser) {
            localStorage.setItem("token", currentUser.loginToken);
            localStorage.setItem("username", currentUser.username);
        }
    }
});