inherit MonsterCode;
 
#include "path.h"
#include BobCode
 
mapping olddrinks;
 
// pete.mov    - standard shopkeeping
// <drink>.mov - drink preparation
// pete2.mov   - banter with poet before poem reading
// pete3.mov   - look around for poet
// pete4.mov   - listen to poetry
// pete5.mov   - post-poem poet banter
 
void extra_create()
  {
  object poetobj;
  set_name( "Pete" );
  add_alias( "pete" );
  add_alias( "perko" );
  add_alias( "perko pete" );
  set_short( "Perko Pete" );
  set_long(
    "The moment you look at this fellow, you say to yourself, "
    "\"Wow!  This man, he KNOWS coffee!\" for the art of "
    "coffeemaking hangs like an aura of power around him.  But "
    "then, that is to be expected; trained by the reclusive "
    "Cashiid al-Suun monks of Persia, the long years of deep "
    "study, the dark rituals, the forbidden knowledge...  Yes, "
    "Pete is one with The Coffee, but he has paid for that kinship "
    "with a price too terrible for any ordinary mortal man..." );
  set_race( "human" );
  set_gender( "male" );
  set_toughness( 1 );
  mp_setup( NPC "pete" );
  set( "lastmp", NPC "pete" );
  set( "busy", 0 );
  set( "current", ({0,0,0,0,0}) );
  olddrinks = ([]);
  }
 
void extra_init()
  {
  add_action( "buy_item", "buy" );
  add_action( "buy_item", "order" );
  add_action( "buy_item", "purchase" );
  }
 
buy_item( string str )
  {
  string drinkprog;
  int cost;
  if( query( "busy" ) )
    {
    command( "go busy status currently " + query("busy") + ".", THISO );
    if( query( "current" )[0] )
      {
      write( "Pete seems to be busy at the moment.\n" );
      command( "go Array \"current\", key 0 is set to \"" +
        query("current")[0] + "\".", THISO );
      return 1;
      }
    command( "go Busy status set with no customer.. "
      "resetting busy to 0.", THISO );
    set( "busy", 0 );
    }
  if( olddrinks[PRNAME] )
    {
    command( "go olddrinks[" + PRNAME +
      "] is currently set as:"
      "\n  [0] - drink obj - " + olddrinks[PRNAME][0] +
      "\n  [1] - cost      - " + olddrinks[PRNAME][1] +
      "\n  [2] - payed?    - " + olddrinks[PRNAME][2] +
      "\n  [3] - drinkprog - " + olddrinks[PRNAME][3], THISO );
    command( "say " + PNAME + ", you need to pay the "
      + olddrinks[PRNAME][1] + " coins for the first drink "
      "I made for you before I even THINK about making "
      "you something else..", THISO );
    return 1;
    }
  switch( str )
    {
    case "hot chocolate" :
    case "chocolate" :
    case "hot cocoa" :
    case "cocoa" :
      drinkprog = "cocoa";
      cost = 150;
      break;
/*
    case "hot tea" :
    case "tea" :
    case "earl gray" :
    case "earl grey" :
      drinkprog = "tea";
      break;
*/
    case "coffee" :
      drinkprog = "coffee";
      cost = 125;
      break;
/*
    case "espresso" :
      drinkprog = "espresso";
      break;
*/
    default :
      drinkprog = "nodrink";
      cost = 0;
      break;
    }
  command( "say Hey Pete!  Gimme some " + str + "!", THISP );
  command( "go drinkprog == " + drinkprog + "\n"
           "           cost == " + cost, THISO );
  set( "current", ({ PRNAME, 0, cost, 0, drinkprog }) );
  set( "busy", 1 );
  command( "say Gotcha.", THISO );
  command( "go No non-standard programs detected.  proceeding "
    "with " + drinkprog + ".mov", THISO );
  mp_setup( COFFEE + drinkprog );
  halt_mp( 1 );
  return 1;
  }
 
price_quote()
  {
  mixed *custinfo;
  custinfo = query( "current" );
  command( "say Lessee..  " + custinfo[4] + " runs " + custinfo[2] +
    " coins, " + CAP( custinfo[0] ) + ".",
    THISO );
  return 0;
  }
 
query_enter_ok( item, who )
  {
  int payout, curorold, payed, x;
  string blah, *keys;
  mixed *custinfo;
  curorold = 0;
  command( "go query_enter_ok() called by " + to_string(who), THISO );
  if( THISP != THISO )
    {
    if( olddrinks[ PRNAME ] && olddrinks[PRNAME][2] == 0 )
      {
      custinfo = ({ PRNAME, olddrinks[ PRNAME ] });
      curorold = 2;
      }
    else if( query("current")[0] && query("current")[3]==0 )
      {
      custinfo = query("current");
      curorold = 1;
      }
    else
      {
      custinfo = ({ 0,0,0,0,0 });
      for( x = 1; x==sizeof(m_indices(olddrinks)); x++ )
        {
        custinfo = ({ PRNAME,
          olddrinks[ m_indices(olddrinks)
            [sizeof(m_indices(olddrinks))-x] ] });
        curorold = 2;
        if( custinfo[3] == 0 )
          break;
        }
      } 
    command( "go curorold == " + curorold, THISO );
    blah = "go custinfo is currently set as:"
      "\n  [0] - PRNAME    - " + to_string(custinfo[0]) +
      "\n  [1] - drink obj - " + to_string(custinfo[1]) +
      "\n  [2] - cost      - " + to_string(custinfo[2]) +
      "\n  [3] - payed?    - " + to_string(custinfo[3]) +
      "\n  [4] - drinkprog - " + to_string(custinfo[4]);
    command( blah, THISO );
    command( "go item->query(MoneyP) == " + item->query(MoneyP), THISO );
    if( !(item -> query(MoneyP)) )
      {
      if( sscanf( load_name(item), COFFEE + "%s", blah ) )
        return 0;
      command( "go Non-money object given.", THISO );
      command( "say Sorry, but I prefer legal tender.", THISO ); 
      return 1;
      }
    if( custinfo[0] == 0 )
      {
      command( "say Uh.. thanks for the tip.", THISO );
      command( "go No drink remaining.", THISO );
      return 0;
      }  
    if( item -> query(MoneyP) < custinfo[2] )
      {
      payout = item -> query(MoneyP);
      command( "say Hmm.. The price is " + custinfo[2] + "; you still "
        "owe me " + ( custinfo[2] - payout ) + ".", THISO );
      custinfo[2] = custinfo[2] - payout;
      command( "go Insufficient coinage given.", THISO );
      switch( curorold )
        {
        case 1:
          set( "current", custinfo );
          command( "go query(\"current\") re-set.. custinfo[2] == "
            + custinfo[2], THISO );
          break;
        case 2:
          olddrinks[custinfo[0]][1] = custinfo[2];
          call_out( "give_drink", 1, custinfo );
          break;
        default:
          command( "go Error in routing payment.", THISO );
          break;
        }
      return 0;
      }
    if( item -> query(MoneyP) == custinfo[2] )
      {
      command( "say Thanks much..", THISO );
      payed=1;
      }
    if( item -> query(MoneyP) > custinfo[2] )
      {
      command( "say Thanks fer the tip..", THISO );
      payed = 1;
      }
    if( payed == 1 )
      {
      custinfo[3] = 1;
      switch( curorold )
        {
        case 1:
          set( "current", custinfo );
          command( "go query(\"current\") re-set.. custinfo[3] == "
            + custinfo[3], THISO );
          break;
        case 2:
          olddrinks[custinfo[0]][2] = 1;
          call_out( "give_drink", 1, custinfo );
          break;
        default:
          command( "go Error in routing payment.", THISO );
          break;
        }
      }
    }
  command( "go done", THISO );
  return 0;
  }
 
stopdrink()
  {
  command( "go stopdrink() called.", THISO );
  set( "busy", 0 );
  set( "current", ({0,0,0,0}) );
  mp_setup( NPC "pete" );
  return 1;
  }
 
begin_give_drink()
  {
int i;
  mixed *custinfo;
  custinfo = query("current");
for(i=0;i<sizeof(custinfo);i++){command("go Custinfo "+i+": "+custinfo[i],THISO);}
  command( "go begin_give_drink() called.", THISO );
  custinfo[1] = clone_object( COFFEE + custinfo[4] );
  command( "go object cloned", THISO );
  call_out( "give_drink", 1, custinfo );
  move_object( custinfo[1], THISO );
  command( "go move_object for " + custinfo[1] + 
    " being attempted.", THISO );
//  move_object( clone_object( COFFEE+custinfo[4] ), THISO );
  }
 
give_drink( mixed *custinfo )
  {
  object drink;
  command( "go give_drink called.", THISO );
  command( "go custinfo is currently set as:"
    "\n  [0] - PRNAME    - " + custinfo[0] +
    "\n  [1] - drink obj - " + custinfo[1] +
    "\n  [2] - cost      - " + custinfo[2] +
    "\n  [3] - payed?    - " + custinfo[3] +
    "\n  [4] - drinkprog - " + custinfo[4], THISO );
  if( !pointerp(custinfo) )
    {
    command( "go custfile array not sent to give_drink() "
      "function..  Aborting.", THISO );
    return;
    }
  if( custinfo[3] == 1 )
    {
    command( "go custinfo[3] == 1; giving drink.", THISO );
    command( "say Okers, here you go..", THISO );
    command( "give " + custinfo[4] + " to " + custinfo[0], THISO );
    if( olddrinks[custinfo[0]] )
      {
      command( "go olddrinks[" + custinfo[0] + "] being removed..",
        THISO );
      olddrinks -= olddrinks[ custinfo[0] ];
      command( "say Thanks for yer patronage, yah-dee yah-dee yah.",
        THISO );
      return;
      }
    else if( query("current")[0] == custinfo[0] )
      {
      stopdrink();
      command( "say Thanks for yer patronage, yah-dee yah-dee yah.",
        THISO );
      return;
      }
    }
  if( query("current")[0] == custinfo[0] )
    {
    command( "go query(\"current\") being added to olddrinks[]", THISO );
    olddrinks += ([ custinfo[0] : custinfo[1..4] ]);
    stopdrink();
    }
  command( "go check_give recycle sequence commencing.", THISO );
  check_give( custinfo );
  return;
  }
 
check_give( mixed *custinfo )
  {
  command( "go check_give called.", THISO );
  command( "say " + CAP(custinfo[0]) + ", your " + custinfo[4] + " is "
    "ready..  You owe me " + custinfo[2] + " coins fer this.", THISO );
  call_out( "give_drink", 12, custinfo );
  return;
  }
  
void in_room()
  {
  if( to_string(ENV(THISO)) != SHOP )
    {
    command( "emote clicks his heels together and vanishes!", THISO );
    move_object( THISO, SHOP );
    command( "emote appears in a puff of smoke.", THISO );
    }
  }  
