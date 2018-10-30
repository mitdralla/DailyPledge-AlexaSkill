/**
 * This is a skill for Daily Pledge - Wellness Pillars. A skill to keep your wellness a top priority.
 * 
 * To open the skill say: "Alexa, open Daily Pledge."
 * 
 * I am posting the DailyPledge skill code in hopes you can learn something from it.
 * I worked very hard to write this, so please don't just copy, paste and submit your own with all of my code.
 * Learn from it, modify it, change it, create.
 * 
 * Written by:  Timothy Allard
 * Date:        11/2017
 * Version:     1.0
 * Website:     http://timothyallard.com/daily-pledge
 * LinkedIn:    https://www.linkedin.com/in/timallard/
 * Github:      @mitdralla
 * 
*/

// I run a tight ship here, complain if we start slacking!
'use strict';
var Alexa = require("alexa-sdk");

exports.handler = function(event, context, callback) 
{
    var alexa = Alexa.handler(event, context, callback);
    
    // Defines the table name we will use in DynamoDB to store our attributes.
    alexa.dynamoDBTableName = 'dailyPledge';
    
    // Our official skill app id from http://developer.amazon.com
    alexa.appId = "amzn1.ask.skill.3e5ac7b9-1311-447e-b260-3a18e6ecaf69";
        
    // Register the custom handelers and execute them.
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'NewSession': function() {
        
        // Let's check to see if the user is new or not.
        if(Object.keys(this.attributes).length === 0) {
            
            // If so, let's tell the skill the user has never been here before.
            this.attributes['is_new_user'] = "yes";
        }
        // Move on to LaunchRequest.
        this.emit("LaunchRequest");
    },
    'LaunchRequest': function() {
        
        // Initial skill launch handler - let's call the welcome function.
        getWelcome.call(this);
        this.emit(':saveState', true);
    },
    'PledgeIntent': function() {
        
        if (this.attributes['previous_place'] === "confirm_pledge") {
            
            pledgeConfirmation.call(this);
        } else if (this.attributes['previous_place'] ===  "pledge_confirmation") {
            
            getIdeas.call(this);
        } else {
            
            this.attributes.is_another = " ";
            getPledge.call(this);
        }
    },
    'CompleteIntent': function() {
        
        if (this.attributes['previous_place'] === "confirm_pledge") {
            
            pledgeConfirmation.call(this);
        } else if (this.attributes['previous_place'] ===  "pledge_confirmation") {
            
            getIdeas.call(this);
        } else {
            
            this.attributes.is_another = " ";
            getPledge.call(this);
        }
    },
    'AnotherIntent': function () {
        
        // The user did not like the first pledge and asked for another.
        // Set the is_another attribute so we can toggle some text.
        this.attributes.is_another = "yes";
        getPledge.call(this);
    },
    'IdeasIntent': function() {
        
    },
    'SessionEndedRequest': function () {
        
        // A little logging
        console.log('session ended!');
        
        // Save all the attributes to dynamoDB
        this.emit(':saveState', true);

    },
    'AMAZON.YesIntent' : function() {
        
        if(this.attributes['previous_place'] === 'welcome') {
            
            // This is the main function which generates a random pledge (possibly based on session attribute criteria to filter specific categories of pledges).
            getPledge.call(this);
        } else if (this.attributes['previous_place'] === "get_pledge") {
            
            // We just presented the user with a pledge, and they want to do it.
            this.attributes.is_another = " ";
            confirmPledge.call(this);
        } else if (this.attributes['previous_place'] === 'pledge_confirmation') {
            
            getIdeas.call(this);
        } else if (this.attributes['previous_place'] === "get_ideas") {
            
            // Now that we have determined the text, we can reset the is_another_pledge flag.
            getIdeas.call(this);
        } else if (this.attributes['previous_place'] === "is_pledge_complete_confirmation") {
            
            // The skill recognized the user is returning after making a new pledge. The user just confirmed they completed it.
            pledgeConfirmationAward.call(this);
        } else if (this.attributes['previous_place'] === 'pledge_confirmation_award') {
            
            getPledge.call(this);
        } else if (this.attributes['previous_place'] === 'give_support') {
            
            getPledge.call(this);
        } else if (this.attributes['previous_place'] === 'continue_pledge') {
            
            getIdeas.call(this);
        } else {
            
            this.response.speak('Good Bye. Come back again soon to get a new pledge.');
            this.emit(':responseReady');
        }
        
    },
    'AMAZON.NoIntent' : function() {
        
        // When given a pledge, the user might say no instead of give me another, let's handle that scenario also.
        if (this.attributes['previous_place'] === "get_pledge") {
            
            // Set the is_another attribute so we can toggle some text.
            this.attributes.is_another = "yes";
            getPledge.call(this);
        } else if (this.attributes['previous_place'] === "is_pledge_complete_confirmation") {
            
            giveSupport.call(this);
        } else if (this.attributes['previous_place'] === "give_support") {
            
            continuePledge.call(this);
        } else if (this.attributes['previous_place'] === "continue_pledge") {
            
            this.response.speak('Good Bye. Come back again soon to get a new pledge.');
            this.emit(':responseReady');
        } else {
            
            this.response.speak('Good Bye. Come back again soon to get a new pledge.');
            this.emit(':responseReady');  
        }
    },
    'AMAZON.StopIntent' : function() {
        
        this.response.speak('Good Bye. Come back again soon to get a new pledge.');
        this.emit(':responseReady');
    },
    'AMAZON.HelpIntent' : function() {
        
        this.response.speak("You can say: what's my pledge");
        this.response.listen("You can say: give me a pledge");
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent' : function() {
        
        this.response.speak('Good Bye. Come back again soon to get a new pledge.');
        this.emit(':responseReady');
    },
    'Unhandled' : function() {
        
        // The skill did not know how to handle the users response. So - elegantly fail.
        this.emit('AMAZON.HelpIntent');
    }
};

//=========================================================================================================================================
// FUNCTIONS
//=========================================================================================================================================

function getWelcome(data) 
{
    // Let's give the user a big welcome. If they are a first time user, let's give them a more in-depth welcome.  
    // For temporary purposes, staticly define a users name.
    let speechOutput = "";
    let speechReprompt = "";

    // Set a previous_place attribute to the session. This is an important attribute which will help us determine where the user came from when getting deeper into conversation.
    this.attributes['previous_place'] = "welcome";
    
    // Check to see if there is a session attribute called is_new_user with the value of yes. This gets determined and set in NewSession handler.
    if (this.attributes['is_new_user'] == "yes") {
        // This is a new user - give them a big welcome.
        speechOutput = "Welcome to Daily Pledge. A skill that keeps your wellness a top priority for the day. " + one_second_break + " Your total wellness crosses many different pillars. Like a physical pillar, social, financial even vocational. So here is how it works." + one_second_break + " I am going to give you a pledge to focus on, I want you to make that a priority over the course of the next 24 hours. Once it is complete, you will come back to get a new one. " + one_second_break + " Would you like to hear your pledge?";
        
        // Give the user 10 pledge points for joining.
        this.attributes['pledge_points'] = 0;
        this.attributes['pledge_points'] += 10;

        // Reprompt to the user if they did not respond within 8 seconds.
        speechReprompt = "Would you like to hear your pledge?";
    } else {
        
        // This is not a users first time, they have been here before and got a pledge.
        this.attributes['previous_place'] = "is_pledge_complete_confirmation";

        // Retrieve the pledge that was stored previously in DynamoDB and set the previous_pledge variable for easy access.
        let previous_pledge = this.attributes.pledge;
        let previous_pledge_name = previous_pledge.endsession_snippet
        
        // This is a returning user - keep messaging it short and sweet, they do not need the full intro text.
        speechOutput = "Welcome back! Last time we spoke, you were working on " + previous_pledge_name + "." + one_second_break + "I hope you put some thought into it. " + one_second_break + " Were you able to complete this pledge?";
        speechReprompt = "Were you able to do your pledge?";
    }   
    
    // This user is no longer a new user.
    this.attributes['is_new_user'] = "no";
    
    // Output the new attributes we just stored in the users session.
    console.log(JSON.stringify(this.attributes));

    this.response.speak(speechOutput);
    this.response.listen(speechReprompt);
    this.emit(':responseReady');
}

function getPledge(data) 
{
    // Set a previous_place attribute to the session. 
    this.attributes['previous_place'] = "get_pledge";
    
    // Placeholder to store a slot variable.
    let categorySlot = "";
    let category = "";
    
    //console.log(JSON.stringify(this.event.request.intent));
    
    // There might not be an intnet.
    if(this.event.request.intent.slots) {
        categorySlot = this.event.request.intent.slots.category;
    }
    
    // Placeholder array to hold some pledges if a user asked for a specific category.
    let filtered_pledges = [];
    let all_pledges = pledgeArray.pledges;
    
    // If there is a category slot filled, the user wants a specific category of pledges to pick from. Let's get that going.
    if (categorySlot && categorySlot.value) {
        category = categorySlot.value.toLowerCase();
        
        // Store the category in the users attributes so we can offer up a new pledge if they don't like the first.
        this.attributes['pledge_category'] = category;

        // Loop through all the pledges.
        for (var i = 0; i < all_pledges.length; i++) {
            
            // Find a pledge attribute tag that matches the slot value.
            if(all_pledges[i].tag.indexOf(categorySlot.value) !== -1) {
                console.log("---> Matched Pledge " + JSON.stringify(all_pledges[i]));
                
                // Create a new temporary array to hold these pledges.
                filtered_pledges.push(all_pledges[i]);
                
                // Save it out to the pledge array.
                pledgeArray.pledges = filtered_pledges;
                
                console.log("---> Filtered Pledge Array " + JSON.stringify(pledgeArray));
            }
        }
    }
    
    // Let's pick a random pledge so we can keep it fresh for the user.
    // We will do this by first, getting the length of the array, randomize it, then store the object into the pledge variable.
    let pledge_array_length = pledgeArray.pledges.length;
    let pledge_id = Math.floor(Math.random()*pledge_array_length);
    
    console.log("---> The Pledge ID (Something goes wrong here). " + pledge_id);
    
    let pledge = pledgeArray.pledges[pledge_id];
    
    // There is a possability this pledge was generated by a user asking for a new one.
    // If this is the case, let's look for the is_another attribute == YES so we can change up some language.
    let is_another_pledge = this.attributes.is_another;
    
    // Make sure we don't go negative. This shouldn't happen, but in the case it did, let's make sure we never see a negative number.
    if(pledge_id <= -1) { pledge_id = 0; }
    
    // Store the newly grabbed pledge in the users session.
    this.attributes['pledge'] = pledge;

    console.log("---> THE PLEDGE " + JSON.stringify(pledge));

    // Next, make it easier to store and call it's attributes.
    let pledge_name = pledge.name;
    let pledge_description = pledge.short_description;

    // Let's generate some intro text so the speech is more dynamic.
    let pledge_intro_text = pledgeIntroductionWords[Math.floor(Math.random()*pledgeIntroductionWords.length)];
    let another_pledge_intro_text = anotherPledgeIntroductionWords[Math.floor(Math.random()*anotherPledgeIntroductionWords.length)];
    let pledge_wellness_pillar = pledge.pillar;
    let pledge_reprompt_snippet = pledge.reprompt_snippet;
    let intro_text = "";
    let outro_text = "";
    let another_try_outro = "";
    
    // Toggle some speech based on if the user recieved the pledge automatically or if th euser asked for a new one.
    if(is_another_pledge === "yes") {
        // The user asked to have a new pledge presented to them.
        intro_text = another_pledge_intro_text;
        outro_text = "Did you like this one better? ";
        another_try_outro = "Or we could try once more by saying give me another.";
    } else {
        // The user has not asked for a new pledge.
        intro_text = pledge_intro_text;
        outro_text = "Do you want to make this pledge? ";
        another_try_outro = "Or you can say give me another and I will see what I can come up with.";
    }
    
    // Put it all together. Our dynamic intro text, the pledge name, a little pause, the pledge description, a little pause, some dynamic outro text, a little pause and some dynamic closing text.
    let speechOutput = intro_text + pledge_name + one_second_break + pledge_description + one_second_break + " this pledge crosses the " + pledge_wellness_pillar + " wellness pillar. " + one_second_break + outro_text + one_second_break + "If so, just say yes. " + another_try_outro;
    
    // Output the new pledge we just stored in the users session.
    console.log(JSON.stringify(this.attributes));

    this.response.speak(speechOutput);
    this.response.listen("Do you want to make this pledge about "+ pledge_reprompt_snippet +"? If so, just say yes.");
    this.emit(':responseReady');
}

function confirmPledge(data) 
{
    // Set a previous_place attribute to the session.
    this.attributes.previous_place = "confirm_pledge";
    
    // Pull out the pledge from the users session.
    let pledge = this.attributes.pledge;
    
    // Generate some dynamic intro text to confirm the pledge.
    let confirm_pledge_intro_text = confirmPledgeIntroductionWords[Math.floor(Math.random()*confirmPledgeIntroductionWords.length)];
    
    // Put it all together. Random intro pledge text, a little pause, I pledge to text, and a confirmation.
    let speechOutput = confirm_pledge_intro_text + one_second_break + " I pledge to " + pledge.pledge_confirmation;
    
    // Output the new pledge we just stored in the users session.
    console.log(JSON.stringify(this.attributes));
    
    this.response.speak(speechOutput);
    this.response.listen("Repeat after me, " + one_second_break +" I pledge to " + pledge.pledge_confirmation);
    this.emit(':responseReady');
}

function pledgeConfirmation(data) 
{
    // Set a previous_place attribute to the session.
    this.attributes.previous_place = "pledge_confirmation";
    
    // Give the user a way to go! And let them know how they can act on this immediatly.
    let speechOutput = "<say-as interpret-as=\"interjection\">way to go!</say-as>, you just took a great step at a healthier you! " + one_second_break +" <audio src=\"" + songs.pledge_accepted + "\" /> For that, I just gave you 10 Pledge points. " + one_second_break + "Now, it's one thing to say you are going to do something, and another to do it. So, to make things easier for you, here are some ways to put this pledge into action. Would you like to hear them?";

    // Output the new pledge we just stored in the users session.
    console.log(JSON.stringify(this.attributes));
    
    this.response.speak(speechOutput);
    this.response.listen("Would you like to hear them?");
    this.emit(':responseReady');
    this.emit(':saveState', true);
}

function pledgeConfirmationAward(data) 
{
    // Set a previous_place attribute to the session.
    this.attributes.previous_place = "pledge_confirmation_award";
    
    // Let's award the user for completing the pledge.
    this.attributes['pledge_points'] += 10;

    // Give the user a way to go! And let them know how they can act on this immediatly.
    let speechOutput = "Fantastic job! Step by step you are improving your overall wellness! " + one_second_break +" For that, I will give you 10 pledge points." + one_second_break + "<audio src=\"" + songs.pledge_accepted + "\" /> Would you like to make another pledge?";

    // OK, the user got their points for doing the pledge, let's change the previous place so they can't get points again.
    this.attributes['previous_place'] = "welcome";
    
    // Output the new pledge we just stored in the users session.
    console.log(JSON.stringify(this.attributes));
    
    this.response.speak(speechOutput);
    this.response.listen("Would you like to make another pledge?");
    this.emit(':responseReady');
    this.emit(':saveState', true);
}

function giveSupport(data) 
{
    // Set a previous_place attribute to the session.
    this.attributes.previous_place = "give_support";

    // Give the user a way to go! And let them know how they can act on this immediatly.
    let speechOutput = "Better wellness takes time and dedication. Don't give up. If you would like to switch to a new pledge, just say yes. Or say no and we will keep it the same for now.";

    // Output the new pledge we just stored in the users session.
    console.log(JSON.stringify(this.attributes));
    
    this.response.speak(speechOutput);
    this.response.listen("Would you like to make another pledge?");
    this.emit(':responseReady');
    this.emit(':saveState', true);
}

function continuePledge(data) 
{
    // Set a previous_place attribute to the session.
    this.attributes.previous_place = "continue_pledge";
    
    let previous_pledge = this.attributes.pledge;
    let previous_pledge_name = previous_pledge.endsession_snippet

    // Give the user a way to go! And let them know how they can act on this immediatly.
    let speechOutput = "Thats great to hear. Keep focus and think about " + previous_pledge_name + " Would you like to hear how you can accomplish this?";

    // Output the new pledge we just stored in the users session.
    console.log(JSON.stringify(this.attributes));
    
    this.response.speak(speechOutput);
    this.response.listen("Would you like to make another pledge?");
    this.emit(':responseReady');
    this.emit(':saveState', true);
}

// Here is how to take action. Called after a user makes their pledge.
function getIdeas(something)
{
    this.attributes.previous_place       = "get_ideas";
    var the_pledge                       = this.attributes.pledge;
    var pledge_examples_array_length     = this.attributes.pledge.examples.length;
    var pledge_example_id                = Math.round(Math.random()*pledge_examples_array_length) -1;
    let pledge_example                   = "";
    let pledge_endsession_snippet        = "";

    console.log(this.attributes.pledge.name);

    // Make sure we don't go negative.
    if(pledge_example_id <= 0) { pledge_example_id = 1; }

    console.log(pledge_example_id);

    pledge_example                       = this.attributes.pledge.examples.example_1;
    pledge_endsession_snippet            = this.attributes.pledge.endsession_snippet;

    // Let's see wht we got.
    console.log(pledge_example);
    
    // Output the new pledge we just stored in the users session.
    console.log(JSON.stringify(this.attributes));
    
    let speechOutput = pledge_example + one_second_break + " Would you like to hear another idea?";

    this.response.speak(speechOutput);
    this.response.listen("Would you like to hear another idea?");
    this.emit(':responseReady');
}

// Helper functions from the Amazon Team to handle slot values.
function isSlotValid(request, slotName){
        var slot = request.intent.slots[slotName];
        //console.log("request = "+JSON.stringify(request)); //uncomment if you want to see the request
        var slotValue;

        //if we have a slot, get the text and store it into speechOutput
        if (slot && slot.value) {
            //we have a value in the slot
            slotValue = slot.value.toLowerCase();
            return slotValue;
        } else {
            //we didn't get a value in the slot.
            return false;
        }
}

function getSlotValues (filledSlots)
{
    // Given event.request.intent.slots, a slots values object so you have
    // What synonym the person said - .synonym
    // What that resolved to - .resolved
    // And if it's a word that is in your slot values - .isValidated
    let slotValues = {};

    console.log(JSON.stringify(filledSlots));

    Object.keys(filledSlots).forEach(function(item) {
        //console.log("item in filledSlots: "+JSON.stringify(filledSlots[item]));
        var name=filledSlots[item].name;
        //console.log("name: "+name);
        if(filledSlots[item]&&
           filledSlots[item].resolutions &&
           filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
           filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
           filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code ) {

            switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
                case "ER_SUCCESS_MATCH":
                    slotValues[name] = {
                        "synonym": filledSlots[item].value,
                        "resolved": filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name,
                        "isValidated": filledSlots[item].value == filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name
                    };
                    break;
                case "ER_SUCCESS_NO_MATCH":
                    slotValues[name] = {
                        "synonym":filledSlots[item].value,
                        "resolved":filledSlots[item].value,
                        "isValidated":false
                    };
                    break;
                }
            } else {
                slotValues[name] = {
                    "synonym": filledSlots[item].value,
                    "resolved":filledSlots[item].value,
                    "isValidated": false
                };
            }
        },this);
        //console.log("slot values: "+JSON.stringify(slotValues));
        return slotValues;
}

//=========================================================================================================================================
// DATA
//=========================================================================================================================================

// Variables for speech
var one_second_break             = "<break time=\"1s\"/>";
var one_two_break                = "<break time=\"2s\"/>";
var one_three_break              = "<break time=\"3s\"/>";

// Audio files array for various sections of the skill.
var songs = {
    "intro": "https://s3.amazonaws.com/dailypledge/officialSkillSounds/opening_sound_official.mp3",
    "easy": "https://s3.amazonaws.com/asksounds/waitingtime1.mp3",
    "medium": "https://s3.amazonaws.com/asksounds/waitingtime3.mp3",
    "hard": "https://s3.amazonaws.com/asksounds/waitingtime2.mp3",
    "correct": "https://s3.amazonaws.com/asksounds/correct1.mp3",
    "pledge_accepted": "https://s3.amazonaws.com/dailypledge/officialSkillSounds/accept_pledge_official.mp3"
};

// Let's keep things as dynamic as possible for giveing the pledge.
// These phrases are used when introducing the pledge for the first time.
// Array of pledge intro phrases.
let pledgeIntroductionWords = [
    "Alright, here is your pledge for today, it is called, ",
    "Ok. Here is your pledge, it's called, ",
    "Your pledge is called, ",
    "Ok great, here it is, it's called, "
];

// When a user askes for a new pledge, let's change up the text.
// These phrases are used when a user asks to recieve a new pledge because they didnt want the first one delivered.
// Array of phrases for giving a new pledge.
let anotherPledgeIntroductionWords = [
    "How about this one. It's called ",
    "Here is another. It's called ",
    "What about this. It's called ",
    "I have a new one for you. It's called "
];

// When a user agrees to do a pledge, give some dynamic intro text.
// Array of pledge confirmation introduction phrases.
let confirmPledgeIntroductionWords = [
    "Ok great <break time=\"1s\"/> repeat after me with a confident and clear voice, ",
    "Fantastic <break time=\"1s\"/> repeat after me with a confident and clear voice, ",
    "Perfect <break time=\"1s\"/> repeat after me with a confident and clear voice, ",
    "Excellent <break time=\"1s\"/> repeat after me with a confident and clear voice, "
];

// Master list of core wellness pillars and their descriptions.
let wellnessPillarsArray = {
    "pillars": [
        {
            "id": 1,
            "name": "Social Wellness",
            "short_description": "The ability to relate to and connect with other people in our world. Our ability to establish and maintain positive relationships with family, friends and co-workers leads to Social Wellness.",
        },
        {
            "id": 2,
            "name": "Emotional Wellness",
            "short_description": "The ability to understand ourselves and cope with the challenges life can bring. The ability to acknowledge and share feelings of anger, fear, sadness or stress; hope, love, joy and happiness in a productive manner leads to Emotional Wellness.",
        },
        {
            "id": 3,
            "name": "Intellectual Wellness",
            "short_description": "The ability to open our minds to new ideas and experiences that can be applied to personal decisions, group interaction and community betterment. The desire to learn new concepts, improve skills and seek challenges in pursuit of lifelong learning leads to Intellectual Wellness.",
        },
        {
            "id": 4,
            "name": "Physical Wellness",
            "short_description": "The ability to maintain a healthy quality of life that allows us to get through our daily activities without fatigue or physical stress. The ability to recognize that our behaviors have a significant impact on our wellness and adopting healthful habits (routine check ups, a balanced diet, exercise, etc.) while avoiding destructive habits (tobacco, drugs, alcohol, etc.) will lead to optimal Physical Wellness.",
        },
        {
            "id": 5,
            "name": "Environmental Wellness",
            "short_description": "The ability to recognize our own responsibility for the quality of the air, the water and the land that surrounds us. The ability to make a positive impact on the quality of our environment, be it our homes, our communities or our planet contributes to our Environmental Wellness.",
        },
        {
            "id": 6,
            "name": "Occupational Wellness",
            "short_description": "The ability to get personal fulfillment from our jobs or our chosen career fields while still maintaining balance in our lives. Our desire to contribute in our careers to make a positive impact on the organizations we work in and to society as a whole leads to Occupational Wellness.",
        },
    ]
};
    


let pledgeArray = {
    "pledges": [
        {
            "id": 1,
            "name": "Sweet Tooth",
            "short_description": "Pledge to eliminate sugary snacks and drinks from your diet. The amount of sugar in every day food is abnormally high and unnecessary. Start by looking at how much sugar is inside things you normally eat.",
            "reprompt_snippet": "watching your sugar intake?",
            "endsession_snippet": "reducing your sugar intake.",
            "pledge_confirmation": "watch my sugar intake.",
            "examples": 
                {
                    "example_1": "Try having your coffee or tea without sugar. Or to start, try putting in a bit less. It doesnt take long before your brain to reset and you wont even miss it.",
                    "example_2": "This one is easy and it involves chocolate. If you are a chocolate lover, go for it dark. The darker the chocolate, the less sugar.",
                    "example_3": "If you can't eliminate all sugar, look for labels marked added sugar. That means sugar was added to sweeten food or drinks even more than it was naturally.",
                    "example_4": "Next time you have a craving for something sweet to drink, replace it with natural flavored water or a beverage with carbonation to give it a nice effect, you can even throw in a lime or lemon!."
                }
            ,
            "pillar": "Physical",
            "tag": ["diet", "health", "exercise"]
        },
        {
            "id": 2,
            "name": "Downward Facing Dog",
            "short_description": "Pledge to take a yoga class. Did you know that Yoga works both the body and the mind? It increases total body awareness, improves flexibility and can help with lowering stress levels.",
            "reprompt_snippet": "taking a Yoga class?",
            "endsession_snippet": "taking a Yoga class.",
            "pledge_confirmation": "take a Yoga class.",
            "examples": 
                {
                    "example_1": "Check out Yoga videos online, or stop by your local Yoga studio.",
                    "example_2": "Ask a friend if you can go with them to their class. They might have a free day pass or session you could use.",
                    "example_3": "Search for for beginner Yoga terms like Downward facing dog, or cat cow online.",
                    "example_4": "Check your local deal site for potential discounts on Yoga classes or memberships."
                }
            ,
            "pillar": "Physical",
            "tag": ["health", "relaxation", "yoga", "mind", "stress", "brain"]
        },
        {
            "id": 3,
            "name": "The Guru",
            "short_description": "Pledge to learn about Meditation techniques. This is all about self mastery and control. How you breathe, how you think, how you are. Studies show meditation can reduce anxiety, stress and greaten your capacity to relax.",
            "reprompt_snippet": "taking a Meditation class?",
            "endsession_snippet": "taking a Meditation class.",
            "pledge_confirmation": "take a Meditation class.",
            "examples": 
                {
                    "example_1": "Start easy. Sit for just 2 minutes at a time for one week. Increase your meditation to 5 minutes after one week.",
                    "example_2": "Try meditating at the same time every day. Specifically try in the morning. It would be a great way to start the day with a clear mind.",
                    "example_3": "Dont worry about the details. Focus on clearing your head, not how to do it. The main thing is to get comfortable.",
                    "example_4": "Focus on your breathing. Take in slow deep breaths and exale slowly. Focus on absolute relaxation."
                }
            ,
            "pillar": "Physical",
            "tag": ["health", "relaxation", "active", "exercise", "stress", "yoga", "mind"]
        },
        {
            "id": 4,
            "name": "Beach Body",
            "short_description": "Pledge to keep your skin safe when out in the sun. Did you know 90% of skin aging comes from the sun? Keep your skin looking healthy by protecting it from the sun's UV rays. ",
            "reprompt_snippet": "keep your skin safe?",
            "endsession_snippet": "keep your skin safe.",
            "pledge_confirmation": "keep your skin safe.",
            "examples": 
                {
                    "example_1": "",
                    "example_2": "",
                    "example_3": "",
                    "example_4": ""
                }
            ,
            "pillar": "Physical",
            "tag": ["health", "skin", "UV rays", "cancer", "sun", "body"]
        },
        {
            "id": 5,
            "name": "Good Posture",
            "short_description": "Pledge to keep good posture. Did you know that in addition to the health issues associated with a sedentary lifestyle, bad posture can affect our health, mood, productivity, and even success.",
            "reprompt_snippet": "have better posture?",
            "endsession_snippet": "have better posture.",
            "pledge_confirmation": "have better posture.",
            "examples": 
                {
                    "example_1": "",
                    "example_2": "",
                    "example_3": "",
                    "example_4": ""
                }
            ,
            "pillar": "Physical",
            "tag": ["health", "posture", "back", "pain", "stiff", "body"]
        },
        {
            "id": 6,
            "name": "Water Logged",
            "short_description": "Pledge to drink more water and stay hydrated. Did you know water helps flush toxins out of your body, and the fewer toxins that come into contact with your colon, bladder, and other organs, the less chance that critical ailments can develop.",
            "reprompt_snippet": "drinking more water?",
            "endsession_snippet": "drinking more water.",
            "pledge_confirmation": "drink more water.",
            "examples": 
                {
                    "example_1": "",
                    "example_2": "",
                    "example_3": "",
                    "example_4": ""
                }
            ,
            "pillar": "Physical",
            "tag": ["health", "hydration", "water", "thirst", "toxins"]
        }
    ]
};


// Template for a pledge.
/*
{
    "id": 2,
    "name": "",
    "short_description": "",
    "reprompt_snippet": "",
    "endsession_snippet": "",
    "pledge_confirmation": "",
    "examples": 
        {
            "example_1": "",
            "example_2": "",
            "example_3": "",
            "example_4": ""
        }
    ,
    "pillar": "",
    "tag": []
}
*/

// List of todos for this skill.
/*
    1. Persistance
        1. XX - Set up an intro for first time users.
        2. Save a users nickname or name.
        3. Don't repeat done pledges, or when finding a new one?
        4. Get a users zipcode to get the weather.
            1. Based on the weather near you, recommend certain things.
        5. Get the date.
            1. Based on the date (or day of the week) - possibly even time, give deeper reccommendations.
    2. Cards
        1. Display cards with product information with referral ID?
    3. Add 4 examples for each.
    4. Sources?
    5. Website?
    6. Blog
    7. Youtube Video?
    8. Speech
        1. XX - Make intro words dynamic. "Here's another..., How about this one..."
    9. Gamificaiton
        1. Points for completing pledges.
*/
