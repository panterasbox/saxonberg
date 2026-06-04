/*
**  09/05/93  Modified by Bloodstorm to be immune to Bard's charm.
**  01/02/94  modified by yertle
**              - moved static text to #defines to clean up extra_create
**                (they used to be in variables, carrying around a bit
**                 of extra weight.  He also had some problems with showing
**                 his longs and shorts properly; possibly related.)
**              - indented everything till it looked easy to read
**              - added funky REACTIONS code to automatically react to 
**                certain things like punching or kicking him (i used the
**                code that used to be in attacked_by to transport the
**                unlucky player in the event that they do this nasty bit.)
**              - commented out combat_messages, since you can't attack
**                him anyways.
*/

#include "/zone/null/eternal/eternal.h"
inherit "/obj/monster/ask_me";
inherit "/zone/null/eternal/monsters/reactions";

#define HEART find_object("/zone/null/eternal/common")
#define CLOTHIERS find_object("/zone/null/eternal/clothiers")
#include "monster.h"
#define HELP    "I'd be happy to assist you!  Feel free to ask me about "+\
                "owners, clothes, or ordering.\n"
#define OWNERS  "As the name implies, Aleron and Anthrax own this store.  "+\
                "Aleron was the man who developed the device which we use "+\
                "to create our fine clothing, while Anthrax is the one who "+\
                "designed this store to market it.\n"
#define CLOTHES "We carry the best in fashionable apparel.  However, do not "+\
                "mistake it for armor.  It has no weight, nor any "+\
                "protective or monetary value. And, as part of our effort "+\
                "to keep the environment clean, our clothing disintegrates "+\
                "a few moments after being dropped.\n"
#define ORDERING "There are two methods of ordering.  You may type 'order "+\
                "<NAME> <SHORT> <LONG>', where NAME is what you refer to "+\
                "the item as (e.g. dress), SHORT is what it looks like in "+\
                "your inventory (e.g. a black dress), and LONG is what it "+\
                "looks like when you examine it (e.g. A long black silk "+\
                "dress with a lace bodice.)  (Note: the <>s are necessary!)  "+\
                "Alternately, you can type 'order name' and I will prompt "+\
                "you for the short and long descriptions.\n"
#define IDUNNO  "I don't know about that, but I can help you with clothes, "+\
                "ordering, or owners.\n"

void extra_init()
// required for reactions.c to work
{
    if(ENV(THISO) != CLOTHIERS) return;
        if(THISP->query_player_kills() > 15 && !IsWizard( THISP ) )
          {
                say("Ambrose bellows: Out of my store, ruffian!\n");
                call_out("throw_victim", 1);
                return;}

        init_reactions();
}

void extra_create()
{
        set_name("ambrose");
        set_short("Ambrose the Tailor");
        set_long(
           "   Ambrose is a slightly portly, rather jovial-looking man, " +
           "apparently in his late forties.  A broad smile parts his short, " +
           "bushy brown beard as you browse around the shop.  His " +
           "twinkling brown eyes examine you through a pair of round-" +
           "lensed spectacles perched on his somewhat bulbous nose.  He "+
           "scratches his balding head as he looks you over, trying to "+
           "decide what would look best on you.  He is dressed in a "+
           "fashionable suit of the finest cut, and has a long measuring "+
           "tape draped around his neck.  He obviously knows his business "+
           "and you can feel free to ask him for help.\n");
        set_race("high_human");
        set_toughness( 100 );
        set_gender("male");

        listen_for("help", HELP);
        listen_for("assistance", HELP);
        listen_for("arrives", "$smile");
        ask_me_about("owners", OWNERS);
        ask_me_about("clothes", CLOTHES);
        ask_me_about("ordering", ORDERING);
        set_dunno_msg(IDUNNO);
        set_aggressive_response("@throw_victim");
        set_affectionate_response("$smile");
        add_property(THISO, NoCombatP);
        add_property(THISO, NoCharmP);
}

void    throw_victim()
// called by: attacked_by(), and when acted on aggressively
{
  if( ENV( THISP ) == HEART ) return; // prevent an endless loop -Locus 1/4/97
        write("Ambrose picks you up and throws you across the city!\n");
        THISP->move_player("through the air!", HEART, 1);
}

void post_engage_combat( object attacker, object victim )
{
        if( victim == THISO )
          throw_victim();
}

int combat_hook(object Victim, object Assailant)
{
        return 0;
}



