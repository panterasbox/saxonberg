#include "/zone/null/toys/tpa/tpa.h"
inherit RoomPlusCode;

int office_open();

void
extra_create()
{
  set( "short", "EotL Teleport Authority Ticket Office" );
  set( "day_light", WELL_LIT );
  set( "night_light", PART_LIT );
  set( "day_long", "" );
  set( "exits", ([ "north" : "/zone/null/eternal/tpa/station" ]) );
  set( "descs", ([ ({ "glass", "window" }) :
                   "This is your typical ticket window, with a small speaker "
                   "mounted in the glass which is connected to a microphone "
                   "on the opposite side.  Where the window meets the counter "
                   "is a tray for passing small items such as coins and cards "
                   "to the clerk.",
                   ({ "Tootie", "tootie", "woman" }) :
                   "It's not quite obvious whether Tootie is a really tall "
                   "dwarf, or a really fat human.  Though her pale complexion "
                   "suggests the latter, the fact that she seems to be "
                   "almost underqualified for a clerk's job at a TPA station "
                   "suggests something...subhuman.",
                   ({ "shirt", "TPA shirt", "tpa shirt" }) :
                   "The fabric already been pretty thin from wear, Tootie's "
                   "girth has stretched this shirt as far as it's going to "
                   "go.  She's got to have been doing this job quite a while.",
                   ({ "wall", "false wall" }) :
                   "The wall is made out of a pair of those portable panels "
                   "they build cube farms out of.  A crudely made sign is "
                   "affixed to it with several push pins.",
                   ({ "sign" }) :
                   "@read_sign"
                   ]) );
  set( "read", ([ ({ "sign" }) : "@read_sign" ]) );
  set( InsideP, 1 );
  set( "reset_data", ([ "machine" : "/zone/null/eternal/tpa/machine",
                        "rack" : "/zone/null/eternal/tpa/rack"  ]) );
  return;
}

void
extra_init()
{
  add_action( "do_buy", "buy" );
  return;
}

string
long( string id )
{
  string out;
  if( stringp(id) && strlen(id) )
    return ::long(id);
       
  if( office_open() )
    out =  "A large pane of glass separates you and the Eternal City office "
           "of the EotL Teleport Authority.  A woman wearing a blue and "
           "white striped TPA shirt with the name 'Tootie' stiched onto the "
           "breast stands behind the counter, seemingly completely unaware "
           "that she might have a customer.  Even though a false wall "
           "separates the ticket counter from the rest of the office, a gap "
           "between the sections of the wall reveals a glimspe of desks, "
           "charts, and maps that make up the workplace of the TPA "
           "employees.  A sign hanging on the wall describes the various "
           "offerings of this office.";
  else
    out =  "A large pane of glass separates you and the Eternal City office "
           "of the EotL Teleport Authority.  The lights of the office are "
           "dim, and a \"Closed\" sign hangs in the window.  Even though a "
           "false wall separates the ticket counter from the rest of the "
           "office, a gap between the sections of the wall reveals a "
           "glimspe of desks, charts, and maps that make up the workplace "
           "of the TPA employees.  A sign hanging on the wall describes "
           "the various offerings of this office.";
  return sprintf("%s\n%s\n%s", short(), ROOMDAEMON->format_long(out), 
                 ROOMDAEMON->make_exit_msg(query("exits")));
}

int
office_open()
{
  int h = CLOCKDAEMON->query_24_hour();
  return ( (h>=9) && (h<18) );
}

string
read_sign()
{
  string out;
  out = sprintf(
        "\n To travel on the Teleport Authority network you must\n"
        " have a TPA card, which you may purhase here.  Credits\n"
        " may also be added to your card, which are required at\n"
        " many stations for travel.\n\n"
        
        "   'buy card'        : purchase a blank TPA card\n"
        "                       %d coins\n"
        "   'buy <n> credits' : add credits to your card\n"
        "                       %d coins per credit\n\n"
        " Office Hours: 9am - 6pm\n", 
        CARD_COST, CREDIT_COST );
  return box_text( out, ({ "##", "#", "##", "##", "##", "##", "#", "##" }),
                   55, 1, 8 ); 
}

int
do_buy( string arg )
{
  int n;
  
  if( !office_open() )
  {
    notify_fail("The office is closed.  Try again later.\n");
    return 0;
  }

  if( !stringp(arg) || !strlen(arg) )
  {
    notify_fail("Buy what?\n");
    return 0;
  }  

  if( arg == "card" )
  {
    if( THISP->query_money() < CARD_COST )
    {
      tell_player(THISP, "After spending a couple minutes counting in her "
        "head, Tootie informs you that you don't have enough money to buy "
        "a TPA card.");
      return 1;
    }
    string out = "";
    if( THISP->query_chextra() && (THISP->query_real_money() < CARD_COST) )
      tell_player(THISP, "You slide your Chextra card under the glass.  "
        "Tootie charges your Chextra card and returns it to you, along with "
        "a blank TPA card.");
    else
      tell_player(THISP, "You slide " + CARD_COST + " coins under the glass.  "
        "Tootie takes your coins and slides a blank TPA card back to you.");
    THISP->add_money(-CARD_COST);
    tell_room(THISO, PNAME + " buys a new TPA card.\n", ({THISP}));

    move_object(clone_object(TPACard), THISP);
    
    return 1;
  }
  else if( sscanf( arg, "%d credits", n ) == 1 )
  {
    object card;
    if( !objectp( card = present_clone( TPACard, THISP ) ) )
    {
      tell_player(THISP, "Tootie stares at you with a confused look on her "
        "face, then excuses herself to go confer with her manager.  Before "
        "she even gets back you realize that you need to buy a TPA card "
        "first.");
      return 1;
    }
    if( THISP->query_money() < (CREDIT_COST*n) )
    {
      tell_player(THISP, "After spending a couple minutes counting in her "
        "head, Tootie informs you that you don't have enough money to buy " +
        n + " credits.");
      return 1;
    }
    
    if( THISP->query_chextra() && (THISP->query_real_money() < CREDIT_COST) )
      tell_player(THISP, "You slide your Chextra card and your TPA card "
        "under the glass.  Tootie charges your Chextra card, then scans "
        "your TPA card through a machine and slides them both back to you.");
    else
      tell_player(THISP, "You slide " + (n*CREDIT_COST) + " coins under the "
        "glass along with your TPA card.  Tootie takes your coins, then scans "
        "your TPA card through a machine and slides it back to you.");
    THISP->add_money(-(n*CREDIT_COST));
    card->add_credits(n);
    tell_player(THISP, "The balance on your card fades in and out..." + 
      card->query_credits() + " credits remaining.");

    tell_room(THISO, PNAME + " buys some credits for " + possessive(THISP) + 
      " TPA card.\n", ({THISP}));
    
    card->multi_check();
    
    return 1;
  }
  else
  {
    notify_fail("That item is not for sale.\n");
    return 0;
  }
}
