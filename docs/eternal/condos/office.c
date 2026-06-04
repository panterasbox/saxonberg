// Devo 20131207
inherit RoomPlusCode;

#include "condo.h"

#define UNIT_COST      1000
#define KEY_COST       10
#define LOCK_COST      100
#define MANAGER_NAME   (ClockObject->query("night") ? "Hector" : "Katie")

void extra_create();
void extra_init();
string read_sign();
int do_buy(string arg);
int do_change(string arg);
object clone_card(int unit);

void extra_create() {
  set( "short", "Eternal Arms Interdimensional Condominiums, Office" );

  string long = "A small service office is attached to the lobby. Though "
    "clean and organized, like the rest of the building, it is in a bit of "
    "disrepair. Still, it is obvious that the management takes careful "
    "consideration to meet the basic needs of the tenants. %s, the %s "
    "manager, sits quietly behind %s desk, %s. Here you can purchase a new "
    "unit, a replacement keycard, or request a lock change. A sign on the "
    "far wall lists prices.";
  set( "day_long",  sprintf(long, "Katie", "day", "her", 
    "watching a movie on her phone.") );
  set( "night_long",  sprintf(long, "Hector", "night", "his",
    "reading a trigonometry textbook.") );

  set( "descs", ([

    ({ "desk" }) : 
    "Aside from several binders labeled as containing various receipts and "
    "invoices, the desktop here is tidy, but sparse. Despite being manned "
    "24/7, it's obvious that business has been pretty slow lately. Also on "
    "the desk is a small printer, used for making new key cards. It is "
    "attached to one of those ancient computer terminals, with the green "
    "and black monochrome displays.",

    ({ "binder", "binders", "receipts", "invoices" }) :
    "The binders only go back as far as Arienle of this year. Older records "
    "must be kept elsewhere in the facility.",

    ({ "computer", "terminal", "printer" }) :
    "Realizing that this is what they use to manage finance and security for "
    "the entire tower, it certainly doesn't do much to ease your mind as a "
    "property owner. On the other hand, if no one has comprimised this "
    "rundown old system by now, it must be pretty solid, right?",

    ({ "sign" }) : "@read_sign"

  ]) );

  set( "day_descs", ([
    ({ "katie", "manager", "day manager" }) : 
    "Back in the tower's golden years, Katie's days would be filled morning "
    "till night interviewing potential tenants, enforcing the association's "
    "by-laws, and overseeing the large service staff that used to work here. "
    "These days, though, her duties are mainly relegated to answering the "
    "phone and the occassional trip to the bank or post office. She could "
    "probably find better work elsewhere, but this place isn't just her job, "
    "it's her home."
  ]) );

  set( "night_descs", ([
    ({ "hector", "manager", "night manager" }) : 
    "The day shift may be pretty slow around here, but the night shift is "
    "positively dead. Hector doesn't seem to mind, though, as the downtime "
    "affords him ample opportunity to pursue his studies in architecture, as "
    "well as earn a little extra scratch to help pay for school. Depite his "
    "humble surroundings, Hector's a dreamer. In the rare moments when he "
    "doesn't have his head buried in homework, he likes to spend his time "
    "sketching out grand ideas for new services, buildings, even entire "
    "cities."
  ]) );

  set( "read", ([ ({ "sign" }) : "@read_sign" ]) );

  set( "day_light", WELL_LIT );
  set( "exits", ([ "north" : CondoDir "/lobby" ]) );
  set( InsideP );
  set( NoCombatP, 1 );
  set( NoMagicP, 1 );
}

string read_sign()
{
  string out;
  out = sprintf(
    "\nWelcome neighbors, present and future, to the Eternal Arms "
    "Interdimensional Condominiums tower! If you're already a tenant here, "
    "you may purchase replacement locks and keycards from the manager. If "
    "you're new to our facility, don't let the decor fool you. As an owner, "
    "your unit will allow you to experience untold wonders as you travel "
    "freely between entirely different dimensions.\n\n"
    "   'buy unit'        : purchase a new condominium\n"
    "                       %d coins\n"
    "   'buy keycard'     : purchase a replacement keycard\n"
    "                       %d coins\n"
    "   'change locks'    : change the locks on your unit\n"
    "                       %d coins\n\n"
    " Office is open 24 hours a day, 7 days a week.\n",
        UNIT_COST, KEY_COST, LOCK_COST );
  return box_text( out, ({ "##", "#", "##", "##", "##", "##", "#", "##" }),
                   55, 1, 8 );
}

void extra_init() {
  add_action("do_buy", "buy");
  add_action("do_change", "change");
}

int do_buy(string arg) {
  arg = lower_case(arg);

  if (member( ([ "condo", "condominium", "unit" ]), arg )) {
    if (CondoServer->query_unit(PRNAME) >= 0) {
      printf("You already own unit number %d. Only one unit per customer.\n", 
        CondoServer->query_unit(PRNAME));
      return 1;
    }
    if (THISP->query_money() < UNIT_COST) {
      printf("%s tells you, \"Sorry, but you don't seem to have enough money "
        "to purchase a new unit. Come back when you've got some more "
        "cash.\"\n",
        MANAGER_NAME);
      return 1;
    }
    int unit = CondoServer->new_unit(PRNAME);
    if (unit < 0) {
      printf("New units are temporarily unavailable.\n");
      return 1;
    }
    move_object(clone_card(unit), THISP);
    move_object(clone_card(unit), THISP);
    printf("%s tells you, \"Congratulations, you are now the proud owner of "
      "unit number %d.\" Here is your keycard, plus a spare just in case. "
      "Replacement keycards may be purchased here for %d coins.\n", 
      MANAGER_NAME, unit, KEY_COST);
    THISP->add_money(-UNIT_COST);
    return 1;

  } else if (member( ([ "keycard", "key", "card" ]), arg )) {
    int unit = CondoServer->query_unit(PRNAME);
    if (unit < 0) {
      printf("You don't own a condominium here!\n");
      return 1;
    }
    if (THISP->query_money() < KEY_COST) {
      printf("%s tells you, \"Sorry, but you don't seem to have enough money "
        "to purchase a new keycard. Come back when you've got some more "
        "cash.\"",
        MANAGER_NAME);
      return 1;
    }
    move_object(clone_card(unit), THISP);
    printf("%s hands you a new keycard.\n", MANAGER_NAME);
    THISP->add_money(-KEY_COST);
    return 1;

  } else { 
    notify_fail("Buy what?\n");
    return 0;
  }
}

int do_change(string arg) {
  arg = lower_case(arg);
  if (member( ([ "lock", "locks" ]), arg )) {
    int unit = CondoServer->query_unit(PRNAME);
    if (unit < 0) {
      printf("You don't own a condominium here!\n");
      return 1;
    }
    if (THISP->query_money() < LOCK_COST) {
      printf("%s tells you, \"Sorry, but you don't seem to have enough money "
        "to request a lock change. Come back when you've got some more "
        "cash.\"",
        MANAGER_NAME);
      return 1;
    }
    int serial = CondoServer->new_serial(unit);
    if (serial < 0) {
      printf("Lock change is temporarily unavailable.\n");
      return 1;
    }
    move_object(clone_card(unit), THISP);
    printf("%s inserts a blank keycard into the printer and punches some "
      "numbers into the computer. %s retrieves the new card from the printer "
      "and hands it to you.\n%s tells you, \"Okay I've assigned a new serial "
      "number to your locks. You can throw away any old keycards you may "
      "have, they will no longer work.\n", 
      MANAGER_NAME, (ClockObject->query("night") ? "He" : "She"), 
      MANAGER_NAME);
    THISP->add_money(-LOCK_COST);
    return 1;

  } else {
    notify_fail("Change what?\n");
    return 0;
  }
}

object clone_card(int unit) {
  object card = clone_object(Keycard);
  card->set_unit(unit);
  card->set_serial(CondoServer->query_serial(unit));
  return card;
}

