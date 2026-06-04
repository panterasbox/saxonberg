#include "/zone/null/eternal/eternal.h"
inherit RoomPlusCode;
#define CloneBank "/zone/present/xmen/temp/goldcross"
#define DAVE "/zone/null/eternal/evil/dave"
#define SAVEFILE "/zone/null/eternal/evil/dave"
#define DRAGON "/zone/null/eternal/evil/dave"
#define PDATAOB "/usr/devo/tutone/pdata"
 
static object whodancing;
static int numtimes, cr;
static string whonamed;
string *dancers;
mapping suckers;
 
void call_dave(string who);

nomorecr() { cr = 0; }
void extra_create() {
  set( "map_symbol", "DTR" );
  set( "map_hint_x", -1 );
  cr = 1;
  set( "short", "Dave's Throne Room");
  set( "day_long",
    "You have entered the throne room of Dave, the Dragon of Death.  You "
    "are in awe of the enormity of the room...sculpted pillars support a "
    "ceiling nearly one hundred feet high; the room itself is large enough "
    "to hold nearly ten thousand people.  At the south end of the room sits "
    "an enormous throne.  Atop the throne sits a colossally large golden "
    "statue of a dragon.\n\n"
    "    Rumor has it that Dave will occasionally respond to the dances of "
    "a mortal, rising to feast upon the soul of a mortal of their choosing.  "
    "You can \"dance\" for Dave if you wish, but beware!  The wrath of Dave "
    "is not easily satiated, nor does his favor come easily." );
    set( "exits", ([ "north": "/zone/null/eternal/room052" ]) );
    set( "descs", ([
      "throne":
        "It's a golden throne, about as big as your average castle.",
      "statue":
        "It's a finely crafted golden statue.  Someday you wish you had a house "
        "half as large.  The Dragon depicted looks wise, yet terrifying."
    ]) );
whodancing = THISO; whonamed = 0; dancers = ({ }); suckers = ([ ]); 
numtimes = random(4)+4;
restore_object(SAVEFILE);
    set( "day_light", WELL_LIT );
    call_out("nomorecr", 60); }
 
void extra_init() { 
  add_action("do_dance", "dance"); }
 
int do_dance() {
  if(THISP->query_age()<43200) {
      write("You are not worthy enough to dance for Dave.\n");
      return 0; }
  if(whodancing==THISP) {
    write("You are already dancing, stupid.\n");
    return 1; }
  if(whodancing!=THISO) {
    write(whodancing->query_name()+" is already dancing.  Please do "
      "not disturb "+objective(whodancing)+".\n");
    return 1; }
  whodancing=THISP;
  write("You begin to dance a wild, exuberant dance.\n");
  add_action("do_nothing", "", 2);
  say(PNAME+" begins to dance for Dave.\n");
  call_out("stop_dance", 30);
  return 1; }
 
int do_nothing(string foo) {
  if(whodancing==THISP) {
    write("You can't do that while dancing.\n");
    if(!IsWizard(THISP)) return 1; }
  return 0; }
 
void stop_dance() {
  int hp, fat, mana, i, str, intl, wil, dex, con, chr;
  string boj, moo, bah;
  remove_action("");
  mana=(int)whodancing->query_mana();
  fat=(int)whodancing->query_fatigue();
  hp=(int)whodancing->query_hp();
  tell_object(whodancing, "You finish your dance.\n"+
    "You fall to the ground, completely exhausted!\n");
  mana=(int)whodancing->query_mana();
  fat=(int)whodancing->query_fatigue();
  hp=(int)whodancing->query_hp();
  str=(int)whodancing->query_base_stat("str");
  intl=(int)whodancing->query_base_stat("int");
  wil=(int)whodancing->query_base_stat("wil");
  dex=(int)whodancing->query_base_stat("dex");
  con=(int)whodancing->query_base_stat("con");
  chr=(int)whodancing->query_base_stat("chr");
  if( str > 4 )  whodancing->change_stat("str", str-4);
  if( intl > 4 )  whodancing->change_stat("int", intl-4);
  if( wil > 4 )  whodancing->change_stat("wil", wil-4);
  if( dex > 4 )  whodancing->change_stat("dex", dex-4);
  if( con > 4 )  whodancing->change_stat("con", con-4);
  if( chr > 4 )  whodancing->change_stat("chr", chr-4);
  whodancing->add_hp(1-hp);
  whodancing->add_mana(1-mana);
  whodancing->add_fatigue(1-fat);
  CloneBank->delete_clone( PRNAME );
  if(member(dancers, PRNAME)!=-1) {
    write("The spirit of Dave appears before you!\n");
    write("Dave says: What, you again?  Go away.\n");
    write("The spirit of Dave disappears.\n"); 
    whodancing=THISO;
    return; }
  call_out("get_name", 1, whodancing);
  whodancing=THISO;
  return; }
 
void extra_reset() { 
  string *keys;
  int i;
  if(!cr) {
  keys = m_indices(suckers);
  for(i=0;i<sizeof(suckers);i++) {
    if(sizeof(suckers[keys[i]])>=numtimes) {
      call_dave(keys[i]);
      break; } }
  return; } }
 
get_name(object dancer) { 
  if(THISP!=dancer) tell_object(FINDP("devo"), "Doh!\n");
  write("The spirit of Dave appears before you!\n"
        "You are in awe of his presence and power.\n");
  tell_room(environment(THISP),
    "The spirit of Dave the Dragon of Death appears before "+
    PNAME+"!\n", ({ THISP }));
  write("Dave says: Your dance has captured my attention.\n");
  write(strformat("You may now \"name\" a player who you think "
         "deserves my wrath.\n", "Dave says: "));
  add_action("do_name", "name");
  call_out("do_ignore", 30); }
 
void do_ignore() {
  remove_action("name");
  write("Dave sneers at you.\n");
  write("Dave says: You take too long, fool.\n");
  tell_room(THISO, "The spirit of Dave disappears into the mist.\n"); }
 
int do_name(string foo) {
  object ob;
  if(!foo || foo=="") return 0;
  remove_call_out("do_ignore");
  whonamed = foo;
  write("You name "+capitalize(foo)+" for Dave.\n");
  say("The word \""+capitalize(foo)+"\" escapes from "+
    PNAME+"'s lips.\n");
  if(!IsUser(foo)) {
    write("Dave sneers at you.\n");
    write(strformat("Don't waste my time with your imaginary friends.",
      "Dave says:" ));
    tell_room(THISO, "The spirit of Dave disappears into the mist.\n"); 
    whonamed = "";
    remove_action("name");
    return 1; }
  ob = clone_object(PDATAOB);
  ob->getpdata(foo);
  if( THISP->query_eval() < ob->query_eval()/2 ) {
    write("Dave scoffs at you.\n");
    write(strformat("Your dance was good, but not THAT good.", 
      "Dave says: "));
    tell_room(THISO, "The spirit of Dave disappears into the mist.\n"); 
     destruct(ob);
    remove_action("name");
    whonamed = "";
    return 1; }
  destruct(ob);
  write("Dave laughs at you.\n");
  write("Dave says: "+capitalize(foo)+"?!?  That pathetic creature?!?\n"+
              "           Are you sure it is worthy of my attention?\n");
  write("Answer YES or NO --> ");
  input_to("do_confirm");
  return 1; }
 
int do_confirm(string foo) {
  if(!foo || foo=="" || foo=="N" || foo=="n" || foo=="NO" ||
     foo=="No" || foo=="no" || foo=="nO") {
    write("Dave says: Very well, then.  You may name another.\n");
    call_out("do_ignore", 30);
    return 1; }
  remove_action("name"); 
  write("Dave says: Okay, I'll think about it.\n");
  write(strformat("I still can't believe you need my help with a "
    "weakling like "+capitalize(whonamed)+".\n", "Dave says: " ));
  tell_room(THISO, "The spirit of Dave disappears into the mist.\n");
  dancers += ({PRNAME});
  if(!suckers[whonamed]) suckers[whonamed] = ({PRNAME});
  else suckers[whonamed] += ({PRNAME});
  whonamed = "";
  save_object(SAVEFILE);
  return 1; }
 
void call_dave(string who){
  object vic;
  vic=find_player(who);
  if(!vic) return; 
  m_delete(suckers, who);
  dancers -= ({PRNAME});
  save_object(SAVEFILE);
  if(IsWizard(vic)) {
    tell_object(vic, "Dave tells you: You have been very bad.\n");
    return; }
  clone_object(DAVE)->utterly_destroy(vic); }
 
void attempt_combat(object a, object v) {
  int dam;
  tell_object(a, "The Spirit of Dave appears before you!\n");
  tell_room(THISO, "The Spirit of Dave appears before "+
    a->query_name()+"!\n", ({ a }) );
  tell_room(THISO, "Spirit of Dave says, \"You DARE to desicrate my "+
    "temple?!  You shall pay!\"\n");
  dam=random(100)+100;
  tell_object(a, "A ghostly flame pours out of the spirit's mouth, "+
    "engulfing you!\n");
  tell_room(THISO, "A ghostly flame pours out of the spirit's mouth, "+
    "engulfing "+a->query_name()+"!\n", ({ a }) );
  a->take_damage(dam, 0, "fire", THISO); }
